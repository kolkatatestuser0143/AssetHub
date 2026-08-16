import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Tenant, TenantModelName, Company, CompanyModelName, Site, SiteModelName, Location, LocationModelName, Department, DepartmentModelName } from '../models/tenancy.schemas';
import { User, UserModelName, Session, SessionModelName, LoginHistory, LoginHistoryModelName } from '../models/user.schemas';
import { Permission, PermissionModelName, Role, RoleModelName } from '../models/rbac.schemas';
import { AssetType, AssetTypeModelName, Asset, AssetModelName, AssetAuditEvent, AssetAuditEventModelName, AssetAssignment, AssetAssignmentModelName, AssetTransfer, AssetTransferModelName } from '../models/asset.schemas';
import { Vendor, VendorModelName, Warranty, WarrantyModelName, CustomFieldDefinition, CustomFieldDefModelName, AssetCustomFieldValue, AssetCustomFieldValueModelName, AssetDocumentMeta, AssetDocumentModelName } from '../models/asset-support.schemas';
import { AssetMaintenance, AssetMaintenanceModelName } from '../models/maintenance.schemas';
import { IdentityProviderConfig, IdentityProviderConfigModelName, ScimToken, ScimTokenModelName, ScimSyncLog, ScimSyncLogModelName } from '../models/identity.schemas';
import { IntegrationInstance, IntegrationInstanceModelName } from '../models/integration.schemas';
import { Plan, PlanModelName, Subscription, SubscriptionModelName, Entitlement, EntitlementModelName } from '../models/billing.schemas';
import { AuditEvent, AuditEventModelName, PlatformAdminNote, PlatformAdminNoteModelName } from '../models/audit.schemas';
import { AssetReportTemplate, AssetReportTemplateModelName, AssetAcknowledgementTemplate, AssetAcknowledgementTemplateModelName, AssetAcknowledgement, AssetAcknowledgementModelName } from '../models/report.schemas';

@Injectable()
export class MongooseDatabaseService {
  readonly businessUnit: Model<Site>;
  constructor(
    @InjectModel(TenantModelName) readonly tenant: Model<Tenant>,
    @InjectModel(CompanyModelName) readonly company: Model<Company>,
    @InjectModel(SiteModelName) readonly plant: Model<Site>,
    @InjectModel(LocationModelName) readonly location: Model<Location>,
    @InjectModel(DepartmentModelName) readonly department: Model<Department>,
    @InjectModel(UserModelName) readonly user: Model<User>, @InjectModel(SessionModelName) readonly session: Model<Session>, @InjectModel(LoginHistoryModelName) readonly loginHistory: Model<LoginHistory>, @InjectModel(PermissionModelName) readonly permission: Model<Permission>, @InjectModel(RoleModelName) readonly role: Model<Role>,
    @InjectModel(AssetTypeModelName) readonly assetType: Model<AssetType>, @InjectModel(AssetModelName) readonly asset: Model<Asset>, @InjectModel(AssetAuditEventModelName) readonly assetAuditEvent: Model<AssetAuditEvent>, @InjectModel(AssetAssignmentModelName) readonly assetAssignment: Model<AssetAssignment>, @InjectModel(AssetTransferModelName) readonly assetTransfer: Model<AssetTransfer>,
    @InjectModel(AssetMaintenanceModelName) readonly assetMaintenance: Model<AssetMaintenance>, @InjectModel(VendorModelName) readonly vendor: Model<Vendor>, @InjectModel(WarrantyModelName) readonly warranty: Model<Warranty>, @InjectModel(CustomFieldDefModelName) readonly customFieldDefinition: Model<CustomFieldDefinition>, @InjectModel(AssetCustomFieldValueModelName) readonly assetCustomFieldValue: Model<AssetCustomFieldValue>, @InjectModel(AssetDocumentModelName) readonly assetDocument: Model<AssetDocumentMeta>,
    @InjectModel(IdentityProviderConfigModelName) readonly identityProviderConfig: Model<IdentityProviderConfig>, @InjectModel(ScimTokenModelName) readonly scimToken: Model<ScimToken>, @InjectModel(ScimSyncLogModelName) readonly scimSyncLog: Model<ScimSyncLog>, @InjectModel(IntegrationInstanceModelName) readonly integrationInstance: Model<IntegrationInstance>, @InjectModel(PlanModelName) readonly plan: Model<Plan>, @InjectModel(SubscriptionModelName) readonly subscription: Model<Subscription>, @InjectModel(EntitlementModelName) readonly entitlement: Model<Entitlement>,
    @InjectModel(AuditEventModelName) readonly auditEvent: Model<AuditEvent>, @InjectModel(PlatformAdminNoteModelName) readonly platformAdminNote: Model<PlatformAdminNote>, @InjectModel(AssetReportTemplateModelName) readonly assetReportTemplate: Model<AssetReportTemplate>, @InjectModel(AssetAcknowledgementTemplateModelName) readonly assetAcknowledgementTemplate: Model<AssetAcknowledgementTemplate>, @InjectModel(AssetAcknowledgementModelName) readonly assetAcknowledgement: Model<AssetAcknowledgement>,
  ) { this.businessUnit = this.plant; }

  async findByIdOrThrow<T>(model: Model<any>, id: string, label: string): Promise<T> { const doc = await model.findById(id).lean(); if (!doc) throw new NotFoundException(`${label} not found`); return doc as T; }
  async findOneOrThrow<T>(model: Model<any>, filter: Record<string, unknown>, label: string): Promise<T> { const doc = await model.findOne(filter).lean(); if (!doc) throw new NotFoundException(`${label} not found`); return doc as T; }
}
