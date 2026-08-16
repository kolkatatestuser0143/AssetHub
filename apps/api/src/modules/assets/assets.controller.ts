import { Body, Controller, Delete, ForbiddenException, Get, Header, NotFoundException, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { Type } from 'class-transformer';
import { IsIn, IsInt, IsISO8601, IsObject, IsOptional, IsString, Min } from 'class-validator';
import { AssetCondition, AssetLifecycleState } from '../../common/enums';
import { MongooseDatabaseService } from '../../common/mongoose-database.service';
import { AssetsService } from './assets.service'; import { AssetImportService } from './asset-import.service'; import { AssetExcelReportService } from './asset-excel-report.service'; import { AssetPdfReportService } from './asset-pdf-report.service'; import { AssetTransferService } from './asset-transfer.service'; import { AssetAssignmentTransactionService } from './asset-assignment-transaction.service'; import { AssetTimelineService } from './asset-timeline.service'; import { AssetSearchService } from './asset-search.service'; import { AssetListService } from './asset-list.service'; import { AssetDetailService } from './asset-detail.service';
import { TenantContextGuard } from '../../common/guards/tenant-context.guard'; import { RbacGuard } from '../../common/guards/rbac.guard'; import { FeatureGuard } from '../../common/guards/feature.guard'; import { RequirePermission } from '../../common/decorators/require-permission.decorator'; import { RequireFeature } from '../../common/decorators/require-feature.decorator';
class CreateAssetDto { @IsString() assetTypeId: string; @IsOptional() @IsString() companyId?: string; @IsOptional() @IsString() locationId?: string; @IsOptional() @IsString() departmentId?: string; @IsOptional() @IsString() vendorId?: string; @IsOptional() @IsIn(Object.values(AssetCondition)) condition?: AssetCondition; @IsOptional() @IsString() serialNumber?: string; @IsOptional() @IsString() model?: string; @IsObject() @IsOptional() fields?: Record<string, unknown>; }
class AssignAssetDto { @IsString() userId: string; @IsString() @IsOptional() notes?: string; }
class ReturnAssetDto { @IsString() @IsOptional() notes?: string; @IsOptional() @IsIn(Object.values(AssetCondition)) condition?: AssetCondition; }
class ConditionDto { @IsIn(Object.values(AssetCondition)) condition!: AssetCondition; }
class TransitionDto { @IsIn(Object.values(AssetLifecycleState)) toState: AssetLifecycleState; @IsString() @IsOptional() reason?: string; }
class VendorDto { @IsString() name: string; @IsOptional() @IsString() contact?: string; }
class ImportCsvDto { @IsString() csv: string; }
class ExcelReportQueryDto { @IsOptional() @IsString() status?: string; @IsOptional() @IsString() companyId?: string; @IsOptional() @IsString() assetTypeId?: string; @IsOptional() @IsString() locationId?: string; @IsOptional() @IsISO8601() fromDate?: string; @IsOptional() @IsISO8601() toDate?: string; }
class AssetListQueryDto { @IsOptional() @IsString() q?: string; @IsOptional() @IsString() status?: string; @IsOptional() @IsString() assetTypeId?: string; @IsOptional() @Type(() => Number) @IsInt() @Min(1) page?: number; @IsOptional() @Type(() => Number) @IsInt() @Min(1) pageSize?: number; @IsOptional() @IsString() sortBy?: string; @IsOptional() @IsIn(['asc', 'desc']) sortDir?: 'asc' | 'desc'; }
class TransferDto { @IsOptional() @IsString() toUserId?: string; @IsOptional() @IsString() toLocationId?: string; @IsOptional() @IsString() toDepartmentId?: string; @IsOptional() @IsString() reason?: string; @IsOptional() @IsString() note?: string; }
class TransferStatusDto { @IsIn(['PENDING', 'APPROVED', 'COMPLETED', 'REJECTED', 'CANCELLED']) status!: 'PENDING' | 'APPROVED' | 'COMPLETED' | 'REJECTED' | 'CANCELLED'; }

@Controller('assets') @UseGuards(TenantContextGuard, RbacGuard, FeatureGuard)
export class AssetsController {
  constructor(private readonly db: MongooseDatabaseService, private readonly assets: AssetsService, private readonly imports: AssetImportService, private readonly excelReports: AssetExcelReportService, private readonly pdfReports: AssetPdfReportService, private readonly transfers: AssetTransferService, private readonly assignmentTransactions: AssetAssignmentTransactionService, private readonly timeline: AssetTimelineService, private readonly searchService: AssetSearchService, private readonly listService: AssetListService, private readonly detail: AssetDetailService) {}

  private async getEffectiveCompanyId(auth: any): Promise<string> {
    const user = await this.db.user.findOne({ _id: auth.userId, tenantId: auth.tenantId }).select({ companyId: 1 }).lean();
    if (!user?.companyId) throw new ForbiddenException('User is not assigned to a company');
    return String(user.companyId);
  }

  private async hasTenantWideScope(auth: any): Promise<boolean> {
    if (auth.crossCompany) return true;
    const user = await this.db.user.findById(auth.userId).select({ tenantId: 1, roleIds: 1 }).lean();
    if (!user || String(user.tenantId) !== String(auth.tenantId) || !user.roleIds?.length) return false;
    const roles = await this.db.role.find({ _id: { $in: user.roleIds }, tenantId: auth.tenantId }).select({ companyId: 1 }).lean();
    return roles.some((role: any) => role.companyId == null);
  }

  private async resolveCompany(auth: any, requestedCompanyId?: string): Promise<string> {
    const tenantWide = await this.hasTenantWideScope(auth);
    const effectiveCompanyId = await this.getEffectiveCompanyId(auth);
    const companyId = requestedCompanyId || effectiveCompanyId;
    const company = await this.db.company.findOne({ _id: companyId, tenantId: auth.tenantId }).select({ _id: 1 }).lean();
    if (!company) throw new NotFoundException('Company not found');
    if (!tenantWide && String(companyId) !== effectiveCompanyId) throw new ForbiddenException('Company out of scope for this user');
    return String(companyId);
  }

  @Get('search') @RequirePermission('asset:read') search(@Query('q') query: string, @Req() req: any) { return this.searchService.search(req.authContext, query ?? ''); }
  @Get() @RequirePermission('asset:read') list(@Query() query: AssetListQueryDto, @Req() req: any) { return this.listService.list(req.authContext, query); }
  @Get('assignments') @RequirePermission('asset:read') listAssignments(@Req() req: any) { return this.assets.listAssignments(req.authContext); }
  @Get('transfers') @RequirePermission('asset:read') listTransfers(@Query() query: TransferStatusDto, @Req() req: any) { return this.transfers.list(req.authContext, query.status); }
  @Get('transfers/:transferId') @RequirePermission('asset:read') getTransfer(@Param('transferId') transferId: string, @Req() req: any) { return this.transfers.get(req.authContext, transferId); }
  @Get('dashboard/summary') @RequirePermission('asset:read') dashboardSummary(@Req() req: any) { return this.assets.getReportSummary(req.authContext); }
  @Get('reports/summary') @RequirePermission('asset:read') @RequireFeature('advanced_reports_enabled') reportSummary(@Req() req: any) { return this.assets.getReportSummary(req.authContext); }
  @Get('reports/excel') @RequirePermission('asset:read') @RequireFeature('advanced_reports_enabled') @Header('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet') @Header('Content-Disposition', 'attachment; filename="assethub-asset-report.xlsx"') reportExcel(@Query() query: ExcelReportQueryDto, @Req() req: any) { return this.excelReports.generate(req.authContext, query); }
  @Get('reports/pdf') @RequirePermission('asset:read') @RequireFeature('advanced_reports_enabled') @Header('Content-Type', 'application/pdf') @Header('Content-Disposition', 'attachment; filename="assethub-asset-report.pdf"') reportPdf(@Query() query: ExcelReportQueryDto, @Req() req: any) { return this.pdfReports.generate(req.authContext, query); }
  @Get('vendors') @RequirePermission('asset:read') async listVendors(@Query('companyId') companyId: string | undefined, @Req() req: any) { const target = await this.resolveCompany(req.authContext, companyId); return this.db.vendor.find({ tenantId: req.authContext.tenantId, companyId: target }).sort({ name: 1 }).lean(); }
  @Post('vendors') @RequirePermission('asset:write') createVendor(@Body() dto: VendorDto, @Req() req: any) { return this.assets.createVendor(req.authContext, dto.name, dto.contact); }
  @Patch('vendors/:vendorId') @RequirePermission('asset:write') updateVendor(@Param('vendorId') vendorId: string, @Body() dto: VendorDto, @Req() req: any) { return this.assets.updateVendor(req.authContext, vendorId, dto.name, dto.contact); }
  @Delete('vendors/:vendorId') @RequirePermission('asset:write') deleteVendor(@Param('vendorId') vendorId: string, @Req() req: any) { return this.assets.deleteVendor(req.authContext, vendorId); }
  @Get('warranties') @RequirePermission('asset:read') listWarranties(@Req() req: any) { return this.assets.listWarranties(req.authContext); }
  @Get('types') @RequirePermission('asset:read') async listTypes(@Query('companyId') companyId: string | undefined, @Req() req: any) { const target = await this.resolveCompany(req.authContext, companyId); return this.db.assetType.find({ companyId: target }).sort({ name: 1 }).lean(); }
  @Delete('types/:assetTypeId') @RequirePermission('asset:write') deleteType(@Param('assetTypeId') assetTypeId: string, @Req() req: any) { return this.assets.deleteAssetType(req.authContext, assetTypeId); }
  @Post('import/preview') @RequirePermission('asset:write') previewImport(@Body() dto: ImportCsvDto, @Req() req: any) { return this.imports.preview(req.authContext, dto.csv); }
  @Post('import') @RequirePermission('asset:write') commitImport(@Body() dto: ImportCsvDto, @Req() req: any) { return this.imports.commit(req.authContext, dto.csv); }
  @Post(':assetId/transfer') @RequirePermission('asset:write') requestTransfer(@Param('assetId') assetId: string, @Body() dto: TransferDto, @Req() req: any) { return this.transfers.request(req.authContext, assetId, dto); }
  @Post('transfers/:transferId/approve') @RequirePermission('asset:write') approveTransfer(@Param('transferId') transferId: string, @Body() dto: TransferDto, @Req() req: any) { return this.transfers.approve(req.authContext, transferId, dto.note); }
  @Post('transfers/:transferId/reject') @RequirePermission('asset:write') rejectTransfer(@Param('transferId') transferId: string, @Body() dto: TransferDto, @Req() req: any) { return this.transfers.reject(req.authContext, transferId, dto.note); }
  @Post('transfers/:transferId/complete') @RequirePermission('asset:write') completeTransfer(@Param('transferId') transferId: string, @Body() dto: TransferDto, @Req() req: any) { return this.transfers.complete(req.authContext, transferId, dto.note); }
  @Post('transfers/:transferId/cancel') @RequirePermission('asset:write') cancelTransfer(@Param('transferId') transferId: string, @Body() dto: TransferDto, @Req() req: any) { return this.transfers.cancel(req.authContext, transferId, dto.note); }

  @Post() @RequirePermission('asset:write') async create(@Body() dto: CreateAssetDto, @Req() req: any) {
    let assetAuth = req.authContext;
    const tenantWide = await this.hasTenantWideScope(req.authContext);
    const effectiveCompanyId = await this.getEffectiveCompanyId(req.authContext);

    if (dto.companyId) {
      const selectedCompany = await this.db.company.findOne({ _id: dto.companyId, tenantId: req.authContext.tenantId }).select({ _id: 1 }).lean();
      if (!selectedCompany) throw new NotFoundException('Selected company not found');
      if (!tenantWide && String(dto.companyId) !== effectiveCompanyId) throw new ForbiddenException('Selected company is outside your scope');
      assetAuth = { ...req.authContext, companyId: String(dto.companyId), crossCompany: tenantWide };
    } else {
      assetAuth = { ...req.authContext, companyId: effectiveCompanyId, crossCompany: tenantWide };
    }

    if (dto.locationId) {
      const location = await this.db.location.findById(dto.locationId).lean();
      if (!location) throw new NotFoundException('Location not found');
      const site = await this.db.plant.findById(location.plantId).lean();
      if (!site) throw new NotFoundException('Site not found');
      const company = await this.db.company.findOne({ _id: site.companyId, tenantId: req.authContext.tenantId }).select({ _id: 1 }).lean();
      if (!company) throw new ForbiddenException('Selected location does not belong to this tenant');
      if (String(site.companyId) !== String(assetAuth.companyId)) throw new ForbiddenException('Selected location does not belong to the selected company');
      assetAuth = { ...assetAuth, companyId: String(site.companyId), crossCompany: tenantWide };
    } else if (dto.departmentId) {
      const department = await this.db.department.findById(dto.departmentId).lean();
      if (!department) throw new NotFoundException('Department not found');
      const location = await this.db.location.findById(department.locationId).lean();
      const site = location ? await this.db.plant.findById(location.plantId).lean() : null;
      if (!site) throw new NotFoundException('Site not found');
      const company = await this.db.company.findOne({ _id: site.companyId, tenantId: req.authContext.tenantId }).select({ _id: 1 }).lean();
      if (!company) throw new ForbiddenException('Selected department does not belong to this tenant');
      if (String(site.companyId) !== String(assetAuth.companyId)) throw new ForbiddenException('Selected department does not belong to the selected company');
      assetAuth = { ...assetAuth, companyId: String(site.companyId), crossCompany: tenantWide };
    }

    return this.assets.createAsset(assetAuth, dto.assetTypeId, { ...(dto.fields ?? {}), locationId: dto.locationId, departmentId: dto.departmentId, vendorId: dto.vendorId, condition: dto.condition, serialNumber: dto.serialNumber, model: dto.model });
  }

  @Get(':assetId') @RequirePermission('asset:read') get(@Param('assetId') assetId: string, @Req() req: any) { return this.detail.get(req.authContext, assetId); }
  @Patch(':assetId/condition') @RequirePermission('asset:write') updateCondition(@Param('assetId') assetId: string, @Body() dto: ConditionDto, @Req() req: any) { return this.assets.updateCondition(req.authContext, assetId, dto.condition); }
  @Post(':assetId/assign') @RequirePermission('asset:write') assign(@Param('assetId') assetId: string, @Body() dto: AssignAssetDto, @Req() req: any) { return this.assignmentTransactions.assign(req.authContext, assetId, dto.userId, dto.notes); }
  @Get(':assetId/assignment') @RequirePermission('asset:read') currentAssignment(@Param('assetId') assetId: string, @Req() req: any) { return this.assets.getCurrentAssignment(req.authContext, assetId); }
  @Post(':assetId/unassign') @RequirePermission('asset:write') unassign(@Param('assetId') assetId: string, @Body() dto: ReturnAssetDto, @Req() req: any) { return this.assignmentTransactions.unassign(req.authContext, assetId, dto.notes, dto.condition); }
  @Get(':assetId/assignment/history') @RequirePermission('asset:read') history(@Param('assetId') assetId: string, @Req() req: any) { return this.assets.listAssignmentHistory(req.authContext, assetId); }
  @Get(':assetId/lifecycle') @RequirePermission('asset:read') lifecycle(@Param('assetId') assetId: string, @Req() req: any) { return this.assets.allowedLifecycleTransitions(req.authContext, assetId); }
  @Get(':assetId/timeline') @RequirePermission('asset:read') timelineView(@Param('assetId') assetId: string, @Req() req: any) { return this.timeline.get(req.authContext, assetId); }
  @Post(':assetId/transition') @RequirePermission('asset:write') transition(@Param('assetId') assetId: string, @Body() dto: TransitionDto, @Req() req: any) { return this.assets.transitionState(req.authContext, assetId, dto.toState, req.authContext.userId, dto.reason); }
}
