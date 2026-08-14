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
exports.UsersService = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("mongoose");
const mongoose_database_service_1 = require("../../common/mongoose-database.service");
const tenant_scoped_repository_1 = require("../../common/tenant-scoped.repository");
const mongoose_utils_1 = require("../../common/mongoose.utils");
let UsersService = class UsersService extends tenant_scoped_repository_1.TenantScopedRepository {
    constructor(db) {
        super();
        this.db = db;
    }
    safe(user) {
        if (!user)
            return user;
        const dto = (0, mongoose_utils_1.toDto)(user);
        if (dto && typeof dto === 'object') {
            delete dto.passwordHash;
            delete dto.totpSecretEnc;
            delete dto.backupCodesHash;
        }
        return dto;
    }
    async list(auth) {
        const docs = await this.db.user.find({ ...this.scope(auth), accountType: 'TENANT' }).sort({ lastName: 1, firstName: 1 }).lean();
        return (0, mongoose_utils_1.toDtoArray)(docs).map((u) => this.safe(u));
    }
    async get(auth, userId) {
        if (!mongoose_1.Types.ObjectId.isValid(userId))
            throw new common_1.NotFoundException('User not found');
        const doc = await this.db.user.findOne({ _id: userId, ...this.scope(auth), accountType: 'TENANT' }).lean();
        if (!doc)
            throw new common_1.NotFoundException('User not found');
        return this.safe(doc);
    }
    async create(auth, input) {
        const companyId = input.companyId ?? auth.companyId;
        if (!auth.crossCompany && companyId !== auth.companyId)
            throw new common_1.NotFoundException('Company not in scope');
        const exists = await this.db.user.findOne({ email: input.email.trim().toLowerCase(), tenantId: auth.tenantId }).lean();
        if (exists)
            throw new common_1.ConflictException('A user with this email already exists');
        const doc = await this.db.user.create({
            tenantId: auth.tenantId,
            companyId,
            email: input.email.trim().toLowerCase(),
            firstName: input.firstName.trim(),
            lastName: input.lastName.trim(),
            jobTitle: input.jobTitle?.trim() || undefined,
            phone: input.phone?.trim() || undefined,
            departmentId: input.departmentId || undefined,
            locationId: input.locationId || undefined,
            isActive: true,
            forcePasswordReset: true,
            roleIds: [],
            accountType: 'TENANT',
            mfaMethod: 'NONE',
            backupCodesHash: [],
        });
        return this.safe(doc.toObject());
    }
    async setActive(auth, userId, active) {
        if (!mongoose_1.Types.ObjectId.isValid(userId))
            throw new common_1.NotFoundException('User not found');
        const doc = await this.db.user.findOneAndUpdate({ _id: userId, ...this.scope(auth), accountType: 'TENANT' }, { $set: { isActive: active } }, { new: true }).lean();
        if (!doc)
            throw new common_1.NotFoundException('User not found');
        if (!active) {
            await this.db.session.updateMany({ userId: String(doc._id), revokedAt: { $exists: false } }, { $set: { revokedAt: new Date(), revokedReason: 'admin_deactivated' } });
        }
        return this.safe(doc);
    }
    async sessions(auth, userId) {
        const user = await this.db.user.findOne({ _id: userId, ...this.scope(auth), accountType: 'TENANT' }).lean();
        if (!user)
            throw new common_1.NotFoundException('User not found');
        const docs = await this.db.session
            .find({ userId: String(user._id) })
            .sort({ lastSeenAt: -1, createdAt: -1 })
            .lean();
        return (0, mongoose_utils_1.toDtoArray)(docs).map((session) => {
            delete session.refreshTokenHash;
            return session;
        });
    }
    async loginHistory(auth, userId) {
        const user = await this.db.user.findOne({ _id: userId, ...this.scope(auth), accountType: 'TENANT' }).lean();
        if (!user)
            throw new common_1.NotFoundException('User not found');
        const docs = await this.db.loginHistory
            .find({ userId: String(user._id) })
            .sort({ occurredAt: -1 })
            .limit(100)
            .lean();
        return (0, mongoose_utils_1.toDtoArray)(docs);
    }
    async revokeSession(auth, userId, sessionId, actorUserId) {
        const user = await this.db.user.findOne({ _id: userId, ...this.scope(auth), accountType: 'TENANT' }).lean();
        if (!user)
            throw new common_1.NotFoundException('User not found');
        if (String(user._id) === actorUserId && String((await this.db.session.findById(sessionId).lean())?._id) === sessionId) {
            throw new common_1.ConflictException('Your current session cannot be revoked from this screen');
        }
        const session = await this.db.session.findOneAndUpdate({ _id: sessionId, userId: String(user._id), revokedAt: { $exists: false } }, { $set: { revokedAt: new Date(), revokedReason: 'admin_revoked' } }, { new: true }).lean();
        if (!session)
            throw new common_1.NotFoundException('Active session not found');
        return { ok: true, sessionId: String(session._id) };
    }
};
exports.UsersService = UsersService;
exports.UsersService = UsersService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [mongoose_database_service_1.MongooseDatabaseService])
], UsersService);
//# sourceMappingURL=users.service.js.map