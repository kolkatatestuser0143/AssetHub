import { HydratedDocument } from 'mongoose';
export declare const PlanModelName = "Plan";
export type PlanDocument = HydratedDocument<Plan>;
export declare class Plan {
    name: string;
    features?: Record<string, unknown>;
}
export declare const PlanSchema: import("mongoose").Schema<Plan, import("mongoose").Model<Plan, any, any, any, import("mongoose").Document<unknown, any, Plan, any, {}> & Plan & {
    _id: import("mongoose").Types.ObjectId;
} & {
    __v: number;
}, any>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, Plan, import("mongoose").Document<unknown, {}, import("mongoose").FlatRecord<Plan>, {}, import("mongoose").DefaultSchemaOptions> & import("mongoose").FlatRecord<Plan> & {
    _id: import("mongoose").Types.ObjectId;
} & {
    __v: number;
}>;
export declare const SubscriptionModelName = "Subscription";
export type SubscriptionDocument = HydratedDocument<Subscription>;
export declare class Subscription {
    tenantId: string;
    planId: string;
    status: string;
    startedAt: Date;
    endsAt?: Date;
}
export declare const SubscriptionSchema: import("mongoose").Schema<Subscription, import("mongoose").Model<Subscription, any, any, any, import("mongoose").Document<unknown, any, Subscription, any, {}> & Subscription & {
    _id: import("mongoose").Types.ObjectId;
} & {
    __v: number;
}, any>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, Subscription, import("mongoose").Document<unknown, {}, import("mongoose").FlatRecord<Subscription>, {}, import("mongoose").DefaultSchemaOptions> & import("mongoose").FlatRecord<Subscription> & {
    _id: import("mongoose").Types.ObjectId;
} & {
    __v: number;
}>;
export declare const EntitlementModelName = "Entitlement";
export type EntitlementDocument = HydratedDocument<Entitlement>;
export declare class Entitlement {
    subscriptionId: string;
    key: string;
    value: unknown;
}
export declare const EntitlementSchema: import("mongoose").Schema<Entitlement, import("mongoose").Model<Entitlement, any, any, any, import("mongoose").Document<unknown, any, Entitlement, any, {}> & Entitlement & {
    _id: import("mongoose").Types.ObjectId;
} & {
    __v: number;
}, any>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, Entitlement, import("mongoose").Document<unknown, {}, import("mongoose").FlatRecord<Entitlement>, {}, import("mongoose").DefaultSchemaOptions> & import("mongoose").FlatRecord<Entitlement> & {
    _id: import("mongoose").Types.ObjectId;
} & {
    __v: number;
}>;
