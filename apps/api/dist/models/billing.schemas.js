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
exports.EntitlementSchema = exports.Entitlement = exports.EntitlementModelName = exports.SubscriptionSchema = exports.Subscription = exports.SubscriptionModelName = exports.PlanSchema = exports.Plan = exports.PlanModelName = void 0;
const mongoose_1 = require("@nestjs/mongoose");
exports.PlanModelName = 'Plan';
let Plan = class Plan {
};
exports.Plan = Plan;
__decorate([
    (0, mongoose_1.Prop)({ required: true, unique: true }),
    __metadata("design:type", String)
], Plan.prototype, "name", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: Object }),
    __metadata("design:type", Object)
], Plan.prototype, "features", void 0);
exports.Plan = Plan = __decorate([
    (0, mongoose_1.Schema)({ collection: 'plans', timestamps: true, versionKey: false })
], Plan);
exports.PlanSchema = mongoose_1.SchemaFactory.createForClass(Plan);
exports.SubscriptionModelName = 'Subscription';
let Subscription = class Subscription {
};
exports.Subscription = Subscription;
__decorate([
    (0, mongoose_1.Prop)({ required: true, index: true }),
    __metadata("design:type", String)
], Subscription.prototype, "tenantId", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", String)
], Subscription.prototype, "planId", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", String)
], Subscription.prototype, "status", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: Date.now }),
    __metadata("design:type", Date)
], Subscription.prototype, "startedAt", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", Date)
], Subscription.prototype, "endsAt", void 0);
exports.Subscription = Subscription = __decorate([
    (0, mongoose_1.Schema)({ collection: 'subscriptions', timestamps: true, versionKey: false })
], Subscription);
exports.SubscriptionSchema = mongoose_1.SchemaFactory.createForClass(Subscription);
exports.EntitlementModelName = 'Entitlement';
let Entitlement = class Entitlement {
};
exports.Entitlement = Entitlement;
__decorate([
    (0, mongoose_1.Prop)({ required: true, index: true }),
    __metadata("design:type", String)
], Entitlement.prototype, "subscriptionId", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", String)
], Entitlement.prototype, "key", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: Object, required: true }),
    __metadata("design:type", Object)
], Entitlement.prototype, "value", void 0);
exports.Entitlement = Entitlement = __decorate([
    (0, mongoose_1.Schema)({ collection: 'entitlements', timestamps: true, versionKey: false })
], Entitlement);
exports.EntitlementSchema = mongoose_1.SchemaFactory.createForClass(Entitlement);
exports.EntitlementSchema.index({ subscriptionId: 1, key: 1 }, { unique: true });
//# sourceMappingURL=billing.schemas.js.map