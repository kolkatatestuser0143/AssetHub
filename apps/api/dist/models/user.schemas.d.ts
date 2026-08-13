import { HydratedDocument } from 'mongoose';
export declare const UserModelName = "User";
export type UserDocument = HydratedDocument<User>;
export declare enum UserAccountType {
    TENANT = "TENANT",
    SYSTEM = "SYSTEM"
}
export declare class User {
    accountType: UserAccountType;
    tenantId: string;
    companyId: string;
    email: string;
    passwordHash?: string;
    firstName: string;
    lastName: string;
    jobTitle?: string;
    phone?: string;
    mfaMethod: string;
    totpSecretEnc?: string;
    backupCodesHash: string[];
    isActive: boolean;
    forcePasswordReset: boolean;
    externalScimId?: string;
    roleIds: string[];
    departmentId?: string;
    locationId?: string;
}
export declare const UserSchema: import("mongoose").Schema<User, import("mongoose").Model<User, any, any, any, import("mongoose").Document<unknown, any, User, any, {}> & User & {
    _id: import("mongoose").Types.ObjectId;
} & {
    __v: number;
}, any>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, User, import("mongoose").Document<unknown, {}, import("mongoose").FlatRecord<User>, {}, import("mongoose").DefaultSchemaOptions> & import("mongoose").FlatRecord<User> & {
    _id: import("mongoose").Types.ObjectId;
} & {
    __v: number;
}>;
export declare const SessionModelName = "Session";
export type SessionDocument = HydratedDocument<Session>;
export declare class Session {
    userId: string;
    refreshTokenHash: string;
    ipAddress?: string;
    userAgent?: string;
    approxLocation?: string;
    lastSeenAt: Date;
    expiresAt: Date;
    revokedAt?: Date;
    revokedReason?: string;
}
export declare const SessionSchema: import("mongoose").Schema<Session, import("mongoose").Model<Session, any, any, any, import("mongoose").Document<unknown, any, Session, any, {}> & Session & {
    _id: import("mongoose").Types.ObjectId;
} & {
    __v: number;
}, any>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, Session, import("mongoose").Document<unknown, {}, import("mongoose").FlatRecord<Session>, {}, import("mongoose").DefaultSchemaOptions> & import("mongoose").FlatRecord<Session> & {
    _id: import("mongoose").Types.ObjectId;
} & {
    __v: number;
}>;
export declare const LoginHistoryModelName = "LoginHistory";
export type LoginHistoryDocument = HydratedDocument<LoginHistory>;
export declare class LoginHistory {
    userId: string;
    success: boolean;
    ipAddress?: string;
    userAgent?: string;
    reason?: string;
    occurredAt: Date;
}
export declare const LoginHistorySchema: import("mongoose").Schema<LoginHistory, import("mongoose").Model<LoginHistory, any, any, any, import("mongoose").Document<unknown, any, LoginHistory, any, {}> & LoginHistory & {
    _id: import("mongoose").Types.ObjectId;
} & {
    __v: number;
}, any>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, LoginHistory, import("mongoose").Document<unknown, {}, import("mongoose").FlatRecord<LoginHistory>, {}, import("mongoose").DefaultSchemaOptions> & import("mongoose").FlatRecord<LoginHistory> & {
    _id: import("mongoose").Types.ObjectId;
} & {
    __v: number;
}>;
