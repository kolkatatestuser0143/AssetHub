import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export const PlanModelName = 'Plan';
export type PlanDocument = HydratedDocument<Plan>;

@Schema({ collection: 'plans', timestamps: true, versionKey: false })
export class Plan {
  @Prop({ required: true, unique: true }) name!: string;
  @Prop({ type: Object }) features?: Record<string, unknown>; // feature flags + limits
}

export const PlanSchema = SchemaFactory.createForClass(Plan);

export const SubscriptionModelName = 'Subscription';
export type SubscriptionDocument = HydratedDocument<Subscription>;

@Schema({ collection: 'subscriptions', timestamps: true, versionKey: false })
export class Subscription {
  @Prop({ required: true, index: true }) tenantId!: string;
  @Prop({ required: true }) planId!: string;
  @Prop({ required: true }) status!: string; // "active" | "trialing" | "past_due" | "canceled"
  @Prop({ default: Date.now }) startedAt!: Date;
  @Prop() endsAt?: Date;
}

export const SubscriptionSchema = SchemaFactory.createForClass(Subscription);

export const EntitlementModelName = 'Entitlement';
export type EntitlementDocument = HydratedDocument<Entitlement>;

@Schema({ collection: 'entitlements', timestamps: true, versionKey: false })
export class Entitlement {
  @Prop({ required: true, index: true }) subscriptionId!: string;
  @Prop({ required: true }) key!: string; // "sso_enabled" | "max_assets" ...
  @Prop({ type: Object, required: true }) value!: unknown;
}

export const EntitlementSchema = SchemaFactory.createForClass(Entitlement);
EntitlementSchema.index({ subscriptionId: 1, key: 1 }, { unique: true });
