import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export const TenantModelName = 'Tenant';
export type TenantDocument = HydratedDocument<Tenant>;

export enum TenantStatus {
  ACTIVE = 'active',
  SUSPENDED = 'suspended',
  ARCHIVED = 'archived',
}

@Schema({ collection: 'tenants', timestamps: true, versionKey: false })
export class Tenant {
  @Prop({ required: true }) name!: string;
  @Prop({ required: true, unique: true }) slug!: string;
  @Prop({ enum: TenantStatus, default: TenantStatus.ACTIVE, index: true }) status!: TenantStatus;
  @Prop() primaryEmail?: string;
  @Prop() phone?: string;
  @Prop() website?: string;
  @Prop() logoFileId?: string;
  @Prop() logoUrl?: string;
  @Prop() faviconFileId?: string;
  @Prop() faviconUrl?: string;
  @Prop() suspendedAt?: Date;
  @Prop() suspendedBy?: string;
  @Prop() suspensionReason?: string;
}

export const TenantSchema = SchemaFactory.createForClass(Tenant);

export const CompanyModelName = 'Company';
export type CompanyDocument = HydratedDocument<Company>;

@Schema({ collection: 'companies', timestamps: true, versionKey: false })
export class Company {
  @Prop({ required: true, index: true }) tenantId!: string;
  @Prop({ required: true }) name!: string;
  @Prop({ required: true }) code!: string;
}

export const CompanySchema = SchemaFactory.createForClass(Company);
CompanySchema.index({ tenantId: 1, code: 1 }, { unique: true });

// Kept as a legacy model for backward compatibility with existing data.
// New tenant-facing organization flows no longer use Business Unit.
export const BusinessUnitModelName = 'BusinessUnit';
export type BusinessUnitDocument = HydratedDocument<BusinessUnit>;

@Schema({ collection: 'business_units', timestamps: true, versionKey: false })
export class BusinessUnit {
  @Prop({ required: true, index: true }) companyId!: string;
  @Prop({ required: true }) name!: string;
}

export const BusinessUnitSchema = SchemaFactory.createForClass(BusinessUnit);

export enum SiteType {
  PLANT = 'plant',
  BRANCH_OFFICE = 'branch_office',
  HEAD_OFFICE = 'head_office',
}

export const PlantModelName = 'Plant';
export type PlantDocument = HydratedDocument<Plant>;

@Schema({ collection: 'plants', timestamps: true, versionKey: false })
export class Plant {
  @Prop({ required: true, index: true }) companyId!: string;
  @Prop({ required: true }) name!: string;
  @Prop({ enum: SiteType, default: SiteType.PLANT, index: true }) type!: SiteType;
}

export const PlantSchema = SchemaFactory.createForClass(Plant);
PlantSchema.index({ companyId: 1, name: 1 });

export const LocationModelName = 'Location';
export type LocationDocument = HydratedDocument<Location>;

@Schema({ collection: 'locations', timestamps: true, versionKey: false })
export class Location {
  @Prop({ required: true, index: true }) plantId!: string;
  @Prop({ required: true }) name!: string;
}

export const LocationSchema = SchemaFactory.createForClass(Location);

export const DepartmentModelName = 'Department';
export type DepartmentDocument = HydratedDocument<Department>;

@Schema({ collection: 'departments', timestamps: true, versionKey: false })
export class Department {
  @Prop({ required: true, index: true }) locationId!: string;
  @Prop({ required: true }) name!: string;
}

export const DepartmentSchema = SchemaFactory.createForClass(Department);
