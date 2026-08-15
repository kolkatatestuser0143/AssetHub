import { BadRequestException, ConflictException, ForbiddenException, Injectable } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import { MongooseDatabaseService } from '../../common/mongoose-database.service';
import { AuthContext } from '../../common/guards/tenant-context.guard';
import { EntitlementService } from '../billing/entitlement.service';
import { AssetLifecycleState } from '../../common/enums';
import { toDtoArray } from '../../common/mongoose.utils';

interface ImportRow {
  line: number;
  assetTypeId: string;
  locationId?: string;
  departmentId?: string;
  vendorId?: string;
  fields: Record<string, unknown>;
}

@Injectable()
export class AssetImportService {
  constructor(
    private readonly db: MongooseDatabaseService,
    private readonly entitlements: EntitlementService,
    @InjectConnection() private readonly connection: Connection,
  ) {}

  async preview(auth: AuthContext, csv: string) {
    await this.entitlements.requireFeature(auth.tenantId, 'bulk_import_enabled');
    const rows = this.parseCsv(csv);
    const validated = await this.validateRows(auth, rows);
    const current = await this.db.asset.countDocuments({ tenantId: auth.tenantId });
    await this.entitlements.requireWithinLimit(auth.tenantId, 'max_assets', current, validated.length);
    return {
      rowCount: validated.length,
      currentAssets: current,
      projectedAssets: current + validated.length,
      rows: validated.map((row) => ({ line: row.line, assetTypeId: row.assetTypeId, locationId: row.locationId ?? null, departmentId: row.departmentId ?? null, vendorId: row.vendorId ?? null, fields: row.fields })),
    };
  }

  async commit(auth: AuthContext, csv: string) {
    await this.entitlements.requireFeature(auth.tenantId, 'bulk_import_enabled');
    const rows = await this.validateRows(auth, this.parseCsv(csv));
    if (!rows.length) throw new BadRequestException('CSV contains no data rows');

    const session = await this.connection.startSession();
    try {
      let result: { imported: number; assets: any[] } | undefined;
      await session.withTransaction(async () => {
        // Lock the tenant document for the duration of the transaction. This
        // serializes concurrent licensed writes for this tenant, preventing
        // two imports from both passing the same max_assets check.
        const tenant = await this.db.tenant.findOneAndUpdate(
          { _id: auth.tenantId },
          { $set: { updatedAt: new Date() } },
          { new: true, session },
        ).lean();
        if (!tenant) throw new BadRequestException('Tenant not found');

        const current = await this.db.asset.countDocuments({ tenantId: auth.tenantId }).session(session);
        await this.entitlements.requireWithinLimit(auth.tenantId, 'max_assets', current, rows.length);

        const grouped = new Map<string, ImportRow[]>();
        for (const row of rows) {
          const list = grouped.get(row.assetTypeId) ?? [];
          list.push(row);
          grouped.set(row.assetTypeId, list);
        }

        const assetNumbers = new Map<number, string>();
        const company = await this.db.company.findOne({ _id: auth.companyId, tenantId: auth.tenantId }).session(session).lean();
        if (!company) throw new BadRequestException('Company not found');

        for (const [assetTypeId, groupedRows] of grouped) {
          const assetType = await this.db.assetType.findOne({ _id: assetTypeId, companyId: auth.companyId }).session(session).lean();
          if (!assetType?.numberingRule) throw new BadRequestException(`Line ${groupedRows[0].line}: asset type numbering rule is unavailable`);
          const previous = assetType.numberingRule.nextSequence;
          const updated = await this.db.assetType.findOneAndUpdate(
            { _id: assetTypeId, companyId: auth.companyId, 'numberingRule.nextSequence': previous },
            { $inc: { 'numberingRule.nextSequence': groupedRows.length } },
            { new: true, session },
          ).lean();
          if (!updated) throw new ConflictException('Asset numbering sequence changed during import; retry the import');
          const rule = assetType.numberingRule;
          groupedRows.forEach((row, index) => {
            const sequence = previous + index;
            assetNumbers.set(row.line, `${rule.prefix}${rule.separator}${company.code}${rule.separator}${String(sequence).padStart(rule.padding, '0')}`);
          });
        }

        const docs = rows.map((row) => ({
          tenantId: auth.tenantId,
          companyId: auth.companyId,
          assetTypeId: row.assetTypeId,
          assetNumber: assetNumbers.get(row.line),
          status: AssetLifecycleState.IN_STOCK,
          locationId: row.locationId,
          departmentId: row.departmentId,
          vendorId: row.vendorId,
          customFields: row.fields as Record<string, string>,
        }));

        const created = await this.db.asset.insertMany(docs, { ordered: true, session });
        result = { imported: created.length, assets: toDtoArray(created.map((doc: any) => doc.toObject())) };
      });

      if (!result) throw new ConflictException('Asset import transaction produced no result');
      return { ok: true, ...result };
    } finally {
      await session.endSession();
    }
  }

  private async validateRows(auth: AuthContext, rows: ImportRow[]) {
    if (!rows.length) throw new BadRequestException('CSV contains no data rows');
    if (rows.length > 5000) throw new BadRequestException('Import batch cannot exceed 5000 rows');

    const assetTypes = await this.db.assetType.find({ companyId: auth.companyId }).lean();
    const assetTypeMap = new Map(assetTypes.map((x: any) => [String(x._id), x]));
    const companyIds = auth.crossCompany
      ? (await this.db.company.find({ tenantId: auth.tenantId }).select({ _id: 1 }).lean()).map((x: any) => String(x._id))
      : [auth.companyId];

    const validRows: ImportRow[] = [];
    for (const row of rows) {
      if (!assetTypeMap.has(row.assetTypeId)) throw new BadRequestException(`Line ${row.line}: assetTypeId is not in your company`);
      if (row.locationId) {
        const location = await this.db.location.findById(row.locationId).lean();
        if (!location) throw new BadRequestException(`Line ${row.line}: locationId not found`);
        const plant = await this.db.plant.findById(location.plantId).lean();
        const bu = plant ? await this.db.businessUnit.findById(plant.businessUnitId).lean() : null;
        if (!plant || !bu || !companyIds.includes(String(bu.companyId))) throw new ForbiddenException(`Line ${row.line}: location is outside your tenant/company scope`);
        if (row.departmentId) {
          const department = await this.db.department.findOne({ _id: row.departmentId, locationId: location._id }).lean();
          if (!department) throw new BadRequestException(`Line ${row.line}: departmentId does not belong to locationId`);
        }
      } else if (row.departmentId) {
        const department = await this.db.department.findById(row.departmentId).lean();
        const location = department ? await this.db.location.findById(department.locationId).lean() : null;
        const plant = location ? await this.db.plant.findById(location.plantId).lean() : null;
        const bu = plant ? await this.db.businessUnit.findById(plant.businessUnitId).lean() : null;
        if (!department || !location || !plant || !bu || !companyIds.includes(String(bu.companyId))) throw new ForbiddenException(`Line ${row.line}: department is outside your tenant/company scope`);
      }
      if (row.vendorId) {
        const vendor = await this.db.vendor.findOne({ _id: row.vendorId, tenantId: auth.tenantId }).lean();
        if (!vendor) throw new BadRequestException(`Line ${row.line}: vendorId is not in your tenant`);
      }
      validRows.push(row);
    }
    return validRows;
  }

  private parseCsv(input: string): ImportRow[] {
    const text = String(input ?? '').replace(/^\uFEFF/, '').trim();
    if (!text) return [];
    const matrix = this.parseCsvMatrix(text);
    if (matrix.length < 2) return [];
    const headers = matrix[0].map((value) => value.trim());
    const required = ['assetTypeId'];
    for (const key of required) if (!headers.includes(key)) throw new BadRequestException(`CSV header missing required column: ${key}`);

    return matrix.slice(1).map((cells, index) => {
      const values: Record<string, string> = {};
      headers.forEach((header, column) => { values[header] = (cells[column] ?? '').trim(); });
      let fields: Record<string, unknown> = {};
      if (values.fieldsJson) {
        try {
          const parsed = JSON.parse(values.fieldsJson);
          if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error('fieldsJson must be an object');
          fields = parsed;
        } catch {
          throw new BadRequestException(`Line ${index + 2}: fieldsJson must be valid JSON object`);
        }
      }
      return {
        line: index + 2,
        assetTypeId: values.assetTypeId,
        locationId: values.locationId || undefined,
        departmentId: values.departmentId || undefined,
        vendorId: values.vendorId || undefined,
        fields,
      } satisfies ImportRow;
    }).filter((row) => row.assetTypeId);
  }

  private parseCsvMatrix(input: string): string[][] {
    const rows: string[][] = [];
    let row: string[] = [];
    let cell = '';
    let quoted = false;
    for (let i = 0; i < input.length; i += 1) {
      const ch = input[i];
      const next = input[i + 1];
      if (ch === '"') {
        if (quoted && next === '"') { cell += '"'; i += 1; continue; }
        quoted = !quoted;
        continue;
      }
      if (!quoted && ch === ',') { row.push(cell); cell = ''; continue; }
      if (!quoted && (ch === '\n' || ch === '\r')) {
        if (ch === '\r' && next === '\n') i += 1;
        row.push(cell); cell = '';
        if (row.some((value) => value !== '')) rows.push(row);
        row = [];
        continue;
      }
      cell += ch;
    }
    if (quoted) throw new BadRequestException('CSV contains an unterminated quoted field');
    row.push(cell);
    if (row.some((value) => value !== '')) rows.push(row);
    return rows;
  }
}
