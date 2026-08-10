import { HydratedDocument } from 'mongoose';
export declare const PermissionModelName = "Permission";
export type PermissionDocument = HydratedDocument<Permission>;
export declare class Permission {
    key: string;
    description?: string;
}
export declare const PermissionSchema: import("mongoose").Schema<Permission, import("mongoose").Model<Permission, any, any, any, import("mongoose").Document<unknown, any, Permission, any, {}> & Permission & {
    _id: import("mongoose").Types.ObjectId;
} & {
    __v: number;
}, any>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, Permission, import("mongoose").Document<unknown, {}, import("mongoose").FlatRecord<Permission>, {}, import("mongoose").DefaultSchemaOptions> & import("mongoose").FlatRecord<Permission> & {
    _id: import("mongoose").Types.ObjectId;
} & {
    __v: number;
}>;
export declare const RoleModelName = "Role";
export type RoleDocument = HydratedDocument<Role>;
export declare class RolePermissionRef {
    permissionId: string;
    permissionKey: string;
}
export declare const RolePermissionRefSchema: import("mongoose").Schema<RolePermissionRef, import("mongoose").Model<RolePermissionRef, any, any, any, import("mongoose").Document<unknown, any, RolePermissionRef, any, {}> & RolePermissionRef & {
    _id: import("mongoose").Types.ObjectId;
} & {
    __v: number;
}, any>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, RolePermissionRef, import("mongoose").Document<unknown, {}, import("mongoose").FlatRecord<RolePermissionRef>, {}, import("mongoose").DefaultSchemaOptions> & import("mongoose").FlatRecord<RolePermissionRef> & {
    _id: import("mongoose").Types.ObjectId;
} & {
    __v: number;
}>;
export declare class Role {
    tenantId: string;
    companyId?: string;
    name: string;
    isSystem: boolean;
    permissions: RolePermissionRef[];
}
export declare const RoleSchema: import("mongoose").Schema<Role, import("mongoose").Model<Role, any, any, any, import("mongoose").Document<unknown, any, Role, any, {}> & Role & {
    _id: import("mongoose").Types.ObjectId;
} & {
    __v: number;
}, any>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, Role, import("mongoose").Document<unknown, {}, import("mongoose").FlatRecord<Role>, {}, import("mongoose").DefaultSchemaOptions> & import("mongoose").FlatRecord<Role> & {
    _id: import("mongoose").Types.ObjectId;
} & {
    __v: number;
}>;
