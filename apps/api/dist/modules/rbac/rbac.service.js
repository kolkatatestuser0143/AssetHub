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
exports.RbacService = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("mongoose");
const mongoose_database_service_1 = require("../../common/mongoose-database.service");
const tenant_scoped_repository_1 = require("../../common/tenant-scoped.repository");
const mongoose_utils_1 = require("../../common/mongoose.utils");
let RbacService = class RbacService extends tenant_scoped_repository_1.TenantScopedRepository {
    constructor(db) {
        super();
        this.db = db;
    }
    async listPermissions() {
        const docs = await this.db.permission.find().sort({ key: 1 }).lean();
        return (0, mongoose_utils_1.toDtoArray)(docs);
    }
    async listRoles(auth) {
        const docs = await this.db.role.find(this.scope(auth)).lean();
        return (0, mongoose_utils_1.toDtoArray)(docs);
    }
    async createRole(auth, name, permissionKeys) {
        const perms = await this.db.permission
            .find({ key: { $in: permissionKeys } })
            .lean();
        const doc = await this.db.role.create({
            tenantId: auth.tenantId,
            companyId: auth.crossCompany ? null : auth.companyId,
            name,
            isSystem: false,
            permissions: perms.map((p) => ({
                permissionId: String(p._id),
                permissionKey: p.key,
            })),
        });
        return (0, mongoose_utils_1.toDto)(doc.toObject());
    }
    async assignRole(auth, userId, roleId) {
        if (!mongoose_1.Types.ObjectId.isValid(roleId) || !mongoose_1.Types.ObjectId.isValid(userId)) {
            throw new Error('Invalid roleId or userId');
        }
        const role = await this.db.role.findOne({ _id: roleId, ...this.scope(auth) }).lean();
        if (!role)
            throw new common_1.NotFoundException('Role not found in your scope');
        const user = await this.db.user.findOne({ _id: userId, ...this.scope(auth) }).lean();
        if (!user)
            throw new common_1.NotFoundException('User not found in your scope');
        if (!auth.crossCompany && role.companyId !== auth.companyId) {
            throw new common_1.ForbiddenException('Role out of scope for this user');
        }
        const doc = await this.db.user.findOneAndUpdate({ _id: userId, ...this.scope(auth), roleIds: { $ne: roleId } }, { $push: { roleIds: roleId } }, { new: true }).lean();
        if (!doc)
            throw new Error('Role already assigned');
        return (0, mongoose_utils_1.toDto)(doc);
    }
};
exports.RbacService = RbacService;
exports.RbacService = RbacService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [mongoose_database_service_1.MongooseDatabaseService])
], RbacService);
//# sourceMappingURL=rbac.service.js.map