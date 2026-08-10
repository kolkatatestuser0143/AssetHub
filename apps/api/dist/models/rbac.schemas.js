"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RoleSchema = exports.Role = exports.RolePermissionRefSchema = exports.RolePermissionRef = exports.RoleModelName = exports.PermissionSchema = exports.Permission = exports.PermissionModelName = void 0;
const mongoose_1 = require("@nestjs/mongoose");
exports.PermissionModelName = 'Permission';
let Permission = class Permission {
};
exports.Permission = Permission;
__decorate([
    (0, mongoose_1.Prop)({ required: true, unique: true }),
    __metadata("design:type", String)
], Permission.prototype, "key", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], Permission.prototype, "description", void 0);
exports.Permission = Permission = __decorate([
    (0, mongoose_1.Schema)({ collection: 'permissions', timestamps: true, versionKey: false })
], Permission);
exports.PermissionSchema = mongoose_1.SchemaFactory.createForClass(Permission);
exports.RoleModelName = 'Role';
let RolePermissionRef = class RolePermissionRef {
};
exports.RolePermissionRef = RolePermissionRef;
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", String)
], RolePermissionRef.prototype, "permissionId", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", String)
], RolePermissionRef.prototype, "permissionKey", void 0);
exports.RolePermissionRef = RolePermissionRef = __decorate([
    (0, mongoose_1.Schema)({ _id: false, versionKey: false })
], RolePermissionRef);
exports.RolePermissionRefSchema = mongoose_1.SchemaFactory.createForClass(RolePermissionRef);
let Role = class Role {
};
exports.Role = Role;
__decorate([
    (0, mongoose_1.Prop)({ required: true, index: true }),
    __metadata("design:type", String)
], Role.prototype, "tenantId", void 0);
__decorate([
    (0, mongoose_1.Prop)({ index: true }),
    __metadata("design:type", String)
], Role.prototype, "companyId", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", String)
], Role.prototype, "name", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: false }),
    __metadata("design:type", Boolean)
], Role.prototype, "isSystem", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: [exports.RolePermissionRefSchema], default: [] }),
    __metadata("design:type", Array)
], Role.prototype, "permissions", void 0);
exports.Role = Role = __decorate([
    (0, mongoose_1.Schema)({ collection: 'roles', timestamps: true, versionKey: false })
], Role);
exports.RoleSchema = mongoose_1.SchemaFactory.createForClass(Role);
exports.RoleSchema.index({ tenantId: 1, name: 1 });
//# sourceMappingURL=rbac.schemas.js.map