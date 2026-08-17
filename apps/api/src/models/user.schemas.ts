import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { MfaMethod } from '../common/enums';

export const UserModelName = 'User';
export type UserDocument = HydratedDocument<User>;

export enum UserAccountType { TENANT = 'TENANT', SYSTEM = 'SYSTEM' }

@Schema({ collection: 'users', timestamps: true, versionKey: false })
export class User {
  @Prop({ required: true, enum: UserAccountType, default: UserAccountType.TENANT, index: true }) accountType!: UserAccountType;
  @Prop({ required: true }) tenantId!: string;
  @Prop({ required: true, index: true }) companyId!: string;
  @Prop({ index: true, sparse: true }) employeeId?: string;
  @Prop({ required: true, unique: true }) email!: string;
  @Prop() passwordHash?: string;
  @Prop({ required: true }) firstName!: string;
  @Prop({ required: true }) lastName!: string;
  @Prop() jobTitle?: string;
  @Prop() phone?: string;
  @Prop({ enum: MfaMethod, default: MfaMethod.NONE }) mfaMethod!: string;
  @Prop() totpSecretEnc?: string;
  @Prop({ type: [String], default: [] }) backupCodesHash!: string[];
  @Prop({ default: true }) isActive!: boolean;
  @Prop({ default: false }) forcePasswordReset!: boolean;
  @Prop({ default: 0, index: true }) authVersion!: number;
  @Prop({ default: 0 }) failedLoginAttempts!: number;
  @Prop({ index: true }) lockedUntil?: Date;
  @Prop({ index: true }) accessTokenHash?: string;
  @Prop() accessTokenIssuedAt?: Date;
  @Prop() accessTokenExpiresAt?: Date;
  @Prop() externalScimId?: string;
  @Prop({ type: [String], default: [] }) roleIds!: string[];
  @Prop() departmentId?: string;
  @Prop() locationId?: string;
}

export const UserSchema = SchemaFactory.createForClass(User);
UserSchema.index({ companyId: 1, externalScimId: 1 }, { unique: true, sparse: true });
UserSchema.index({ tenantId: 1, companyId: 1, employeeId: 1 }, { unique: true, sparse: true });
UserSchema.index({ accountType: 1, accessTokenHash: 1 }, { sparse: true });
UserSchema.index({ accessTokenExpiresAt: 1 }, { expireAfterSeconds: 0, sparse: true });

export const SessionModelName = 'Session';
export type SessionDocument = HydratedDocument<Session>;

@Schema({ collection: 'sessions', timestamps: true, versionKey: false })
export class Session {
  @Prop({ required: true, index: true }) userId!: string;
  @Prop({ required: true, unique: true }) refreshTokenHash!: string;
  @Prop({ required: true, index: true }) familyId!: string;
  @Prop({ index: true }) parentTokenHash?: string;
  @Prop() ipAddress?: string;
  @Prop() userAgent?: string;
  @Prop() approxLocation?: string;
  @Prop({ default: Date.now }) lastSeenAt!: Date;
  @Prop({ required: true }) expiresAt!: Date;
  @Prop() revokedAt?: Date;
  @Prop() revokedReason?: string;
}

export const SessionSchema = SchemaFactory.createForClass(Session);
SessionSchema.index({ userId: 1, revokedAt: 1, expiresAt: 1 });
SessionSchema.index({ familyId: 1, revokedAt: 1 });

export const LoginHistoryModelName = 'LoginHistory';
export type LoginHistoryDocument = HydratedDocument<LoginHistory>;

@Schema({ collection: 'login_history', timestamps: true, versionKey: false })
export class LoginHistory {
  @Prop({ required: true, index: true }) userId!: string;
  @Prop({ required: true }) success!: boolean;
  @Prop() ipAddress?: string;
  @Prop() userAgent?: string;
  @Prop() reason?: string;
  @Prop({ default: Date.now }) occurredAt!: Date;
}

export const LoginHistorySchema = SchemaFactory.createForClass(LoginHistory);
LoginHistorySchema.index({ userId: 1, occurredAt: -1 });
