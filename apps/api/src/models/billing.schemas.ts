import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export const PlanModelName = 'Plan';
export type PlanDocument = HydratedDocument<Plan>;

@Schema({ collection: 'plans', timestamps: true, versionKey: false })
export class Plan {
  @Prop({ required: true, unique: true }) name!: string;
  @Prop({ required: true, enum: ['trial', 'starter', 'professional', 'enterprise', 'restricted'], default: 'starter' }) themePreset!: 'trial' | 'starter' | 'professional' | 'enterprise' | 'restricted';
  @Prop({ type: Object }) features?: Record<string, unknown>;
  @Prop({ default: true, index: true }) isActive!: boolean;
}

export const PlanSchema = SchemaFactory.createForClass(Plan);

export const SubscriptionModelName = 'Subscription';
export type SubscriptionDocument = HydratedDocument<Subscription>;

@Schema({ collection: 'subscriptions', timestamps: true, versionKey: false })
export class Subscription {
  @Prop({ required: true, index: true }) tenantId!: string;
  @Prop({ required: true }) planId!: string;
  @Prop({ required: true }) status!: string;
  @Prop({ default: Date.now }) startedAt!: Date;
  @Prop() endsAt?: Date;
  @Prop() graceUntil?: Date;
}

export const SubscriptionSchema = SchemaFactory.createForClass(Subscription);
SubscriptionSchema.index({ tenantId: 1, status: 1 });
SubscriptionSchema.index(
  { tenantId: 1 },
  { unique: true, partialFilterExpression: { status: { $in: ['active', 'trialing', 'past_due'] } } },
);

export const EntitlementModelName = 'Entitlement';
export type EntitlementDocument = HydratedDocument<Entitlement>;

@Schema({ collection: 'entitlements', timestamps: true, versionKey: false })
export class Entitlement {
  @Prop({ required: true, index: true }) subscriptionId!: string;
  @Prop({ required: true }) key!: string;
  @Prop({ type: Object, required: true }) value!: unknown;
  @Prop({ enum: ['plan', 'override'], default: 'plan', index: true }) source!: 'plan' | 'override';
}

export const EntitlementSchema = SchemaFactory.createForClass(Entitlement);
EntitlementSchema.index({ subscriptionId: 1, key: 1 }, { unique: true });
