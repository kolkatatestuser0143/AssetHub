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
exports.CustomFieldsService = void 0;
const common_1 = require("@nestjs/common");
const mongoose_database_service_1 = require("../../common/mongoose-database.service");
const tenant_scoped_repository_1 = require("../../common/tenant-scoped.repository");
const mongoose_utils_1 = require("../../common/mongoose.utils");
const FIELD_TYPES = new Set(['text', 'number', 'boolean', 'date']);
let CustomFieldsService = class CustomFieldsService extends tenant_scoped_repository_1.TenantScopedRepository {
    constructor(db) {
        super();
        this.db = db;
    }
    async listDefinitions(auth) {
        const docs = await this.db.customFieldDefinition.find(this.scope(auth)).sort({ key: 1 }).lean();
        return (0, mongoose_utils_1.toDtoArray)(docs);
    }
    async createDefinition(auth, key, label, fieldType) {
        const normalizedKey = key.trim();
        if (!/^[a-z][a-z0-9_.-]{0,63}$/.test(normalizedKey)) {
            throw new common_1.BadRequestException('key must start with a letter and contain only letters, numbers, dot, dash, or underscore');
        }
        if (!FIELD_TYPES.has(fieldType)) {
            throw new common_1.BadRequestException(`fieldType must be one of: ${Array.from(FIELD_TYPES).join(', ')}`);
        }
        try {
            const doc = await this.db.customFieldDefinition.create({
                tenantId: auth.tenantId,
                companyId: auth.companyId,
                key: normalizedKey,
                label: label.trim(),
                fieldType,
            });
            return (0, mongoose_utils_1.toDto)(doc.toObject());
        }
        catch (error) {
            if (error?.code === 11000)
                throw new common_1.ConflictException('Custom field key already exists');
            throw error;
        }
    }
    async updateDefinition(auth, key, label, fieldType) {
        if (fieldType !== undefined && !FIELD_TYPES.has(fieldType)) {
            throw new common_1.BadRequestException(`fieldType must be one of: ${Array.from(FIELD_TYPES).join(', ')}`);
        }
        const updated = await this.db.customFieldDefinition.findOneAndUpdate({ ...this.scope(auth), key }, {
            ...(label !== undefined ? { $set: { label: label.trim() } } : {}),
            ...(fieldType !== undefined ? { $set: { fieldType } } : {}),
        }, { new: true }).lean();
        if (!updated)
            throw new common_1.NotFoundException('Custom field not found');
        return (0, mongoose_utils_1.toDto)(updated);
    }
    async deleteDefinition(auth, key) {
        const deleted = await this.db.customFieldDefinition.findOneAndDelete({ ...this.scope(auth), key }).lean();
        if (!deleted)
            throw new common_1.NotFoundException('Custom field not found');
        return { ok: true };
    }
    async getValues(auth, assetId) {
        const asset = await this.db.asset.findOne({ _id: assetId, ...this.scope(auth) }).lean();
        if (!asset)
            throw new common_1.NotFoundException('Asset not found');
        return asset.customFields ?? {};
    }
    async setValues(auth, assetId, values) {
        const asset = await this.db.asset.findOne({ _id: assetId, ...this.scope(auth) }).lean();
        if (!asset)
            throw new common_1.NotFoundException('Asset not found');
        const definitions = await this.db.customFieldDefinition.find(this.scope(auth)).lean();
        const byKey = new Map(definitions.map((definition) => [definition.key, definition]));
        for (const [key, value] of Object.entries(values)) {
            const definition = byKey.get(key);
            if (!definition)
                throw new common_1.BadRequestException(`Unknown custom field: ${key}`);
            this.validateValue(key, definition.fieldType, value);
        }
        const merged = { ...(asset.customFields ?? {}), ...Object.fromEntries(Object.entries(values).map(([key, value]) => [key, this.serializeValue(value)])) };
        const updated = await this.db.asset.findOneAndUpdate({ _id: assetId, ...this.scope(auth) }, { $set: { customFields: merged } }, { new: true }).lean();
        if (!updated)
            throw new common_1.NotFoundException('Asset not found');
        return updated.customFields ?? {};
    }
    async clearValue(auth, assetId, key) {
        const asset = await this.db.asset.findOne({ _id: assetId, ...this.scope(auth) }).lean();
        if (!asset)
            throw new common_1.NotFoundException('Asset not found');
        const definition = await this.db.customFieldDefinition.findOne({ ...this.scope(auth), key }).lean();
        if (!definition)
            throw new common_1.NotFoundException('Custom field not found');
        const values = { ...(asset.customFields ?? {}) };
        delete values[key];
        const updated = await this.db.asset.findOneAndUpdate({ _id: assetId, ...this.scope(auth) }, { $set: { customFields: values } }, { new: true }).lean();
        if (!updated)
            throw new common_1.NotFoundException('Asset not found');
        return updated.customFields ?? {};
    }
    validateValue(key, type, value) {
        if (value === null || value === undefined)
            throw new common_1.BadRequestException(`${key} cannot be null`);
        if (type === 'text' && typeof value !== 'string')
            throw new common_1.BadRequestException(`${key} must be text`);
        if (type === 'number' && (typeof value !== 'number' || !Number.isFinite(value)))
            throw new common_1.BadRequestException(`${key} must be a finite number`);
        if (type === 'boolean' && typeof value !== 'boolean')
            throw new common_1.BadRequestException(`${key} must be boolean`);
        if (type === 'date' && (typeof value !== 'string' || Number.isNaN(Date.parse(value))))
            throw new common_1.BadRequestException(`${key} must be an ISO date string`);
    }
    serializeValue(value) {
        if (typeof value === 'string')
            return value;
        return JSON.stringify(value);
    }
};
exports.CustomFieldsService = CustomFieldsService;
exports.CustomFieldsService = CustomFieldsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [mongoose_database_service_1.MongooseDatabaseService])
], CustomFieldsService);
//# sourceMappingURL=custom-fields.service.js.map