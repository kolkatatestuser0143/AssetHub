import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export const PermissionModelName = 'Permission';
export type PermissionDocument = HydratedDocument<Permission>;

@Schema({ collection: 'permissions', timestamps: true, versionKey: false })
export class Permission {
  @Prop({ required: true, unique: true }) key!: string; // "asset:read", ...
  @Prop() description?: string;
}

export const PermissionSchema = SchemaFactory.createForClass(Permission);

export const RoleModelName = 'Role';
export type RoleDocument = HydratedDocument<Role>;

@Schema({ _id: false, versionKey: false })
export class RolePermissionRef {
  @Prop({ required: true }) permissionId!: string;
  @Prop({ required: true }) permissionKey!: string; // denormalized: avoids a lookup when resolving user permissions
}

export const RolePermissionRefSchema = SchemaFactory.createForClass(RolePermissionRef);

@Schema({ collection: 'roles', timestamps: true, versionKey: false })
export class Role {
  @Prop({ required: true, index: true }) tenantId!: string;
  @Prop({ index: true }) companyId?: string; // absent => tenant-level role
  @Prop({ required: true }) name!: string;
  @Prop({ default: false }) isSystem!: boolean; // seeded roles, not user-deletable

  // Denormalized role->permission mapping (MongoDB has no join tables)
  @Prop({ type: [RolePermissionRefSchema], default: [] }) permissions!: RolePermissionRef[];
}

export const RoleSchema = SchemaFactory.createForClass(Role);
RoleSchema.index({ tenantId: 1, name: 1 });
