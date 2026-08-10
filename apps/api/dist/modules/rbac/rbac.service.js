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
const mongoose_utils_1 = require("../../common/mongoose.utils");
let RbacService = class RbacService {
    constructor(db) {
        this.db = db;
    }
    async listPermissions() {
        const docs = await this.db.permission.find().sort({ key: 1 }).lean();
        return (0, mongoose_utils_1.toDtoArray)(docs);
    }
    async listRoles(auth) {
        const filter = auth.crossCompany
            ? { tenantId: auth.tenantId }
            : { tenantId: auth.tenantId, companyId: auth.companyId };
        const docs = await this.db.role.find(filter).lean();
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
    async assignRole(userId, roleId) {
        if (!mongoose_1.Types.ObjectId.isValid(roleId) || !mongoose_1.Types.ObjectId.isValid(userId)) {
            throw new Error('Invalid roleId or userId');
        }
        const doc = await this.db.user.findOneAndUpdate({ _id: userId, roleIds: { $ne: roleId } }, { $push: { roleIds: roleId } }, { new: true }).lean();
        if (!doc)
            throw new Error('User not found or role already assigned');
        return (0, mongoose_utils_1.toDto)(doc);
    }
};
exports.RbacService = RbacService;
exports.RbacService = RbacService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [mongoose_database_service_1.MongooseDatabaseService])
], RbacService);
//# sourceMappingURL=rbac.service.js.map