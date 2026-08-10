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
exports.ProvisioningService = void 0;
const common_1 = require("@nestjs/common");
const mongoose_database_service_1 = require("../../common/mongoose-database.service");
let ProvisioningService = class ProvisioningService {
    constructor(db) {
        this.db = db;
    }
    async upsertFromIdentity(companyId, tenantId, identity) {
        const existing = await this.db.user
            .findOne({ companyId, externalScimId: identity.externalId })
            .lean();
        if (existing) {
            const doc = await this.db.user
                .findOneAndUpdate({ _id: existing._id }, {
                $set: {
                    email: identity.email,
                    firstName: identity.firstName ?? existing.firstName,
                    lastName: identity.lastName ?? existing.lastName,
                },
            }, { new: true })
                .lean();
            return doc;
        }
        const byEmail = await this.db.user.findOne({ email: identity.email }).lean();
        if (byEmail) {
            const doc = await this.db.user
                .findOneAndUpdate({ _id: byEmail._id }, { $set: { externalScimId: identity.externalId } }, { new: true })
                .lean();
            return doc;
        }
        return this.db.user.create({
            tenantId,
            companyId,
            email: identity.email,
            firstName: identity.firstName ?? '',
            lastName: identity.lastName ?? '',
            externalScimId: identity.externalId,
            isActive: true,
            forcePasswordReset: false,
            roleIds: [],
        });
    }
};
exports.ProvisioningService = ProvisioningService;
exports.ProvisioningService = ProvisioningService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [mongoose_database_service_1.MongooseDatabaseService])
], ProvisioningService);
//# sourceMappingURL=provisioning.service.js.map