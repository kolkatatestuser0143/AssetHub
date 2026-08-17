import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Types } from 'mongoose';
import { MongooseDatabaseService } from '../../common/mongoose-database.service';
import { UserAccountType } from '../../models/user.schemas';

@Injectable()
export class SystemSecurityService {
  constructor(private readonly db: MongooseDatabaseService) {}

  async sessions() {
    const now = new Date();
    const sessions = await this.db.session.find({ revokedAt: { $exists: false }, expiresAt: { $gt: now } }).sort({ lastSeenAt: -1, createdAt: -1 }).limit(500).lean();
    const userIds = [...new Set(sessions.map((s: any) => String(s.userId)))];
    const users = await this.db.user.find({ _id: { $in: userIds }, accountType: UserAccountType.SYSTEM }).select({ email: 1, firstName: 1, lastName: 1, isActive: 1 }).lean();
    const userMap = new Map(users.map((u: any) => [String(u._id), u]));
    return sessions.filter((s: any) => userMap.has(String(s.userId))).map((s: any) => { const user: any = userMap.get(String(s.userId)); return { id: String(s._id), userId: String(s.userId), email: user.email, name: `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim() || user.email, isActive: user.isActive !== false, ipAddress: s.ipAddress ?? null, userAgent: s.userAgent ?? null, createdAt: s.createdAt, lastSeenAt: s.lastSeenAt ?? s.createdAt, expiresAt: s.expiresAt }; });
  }

  async revokeSession(sessionId: string, actorUserId?: string) {
    if (!Types.ObjectId.isValid(sessionId)) throw new BadRequestException('Invalid session id');
    const session = await this.db.session.findById(sessionId).lean();
    if (!session) throw new NotFoundException('Session not found');
    const user = await this.db.user.findOne({ _id: session.userId, accountType: UserAccountType.SYSTEM }).lean();
    if (!user) throw new NotFoundException('System administrator session not found');
    const result = await this.db.session.updateOne({ _id: session._id, revokedAt: { $exists: false } }, { $set: { revokedAt: new Date(), revokedReason: 'platform_security_revocation' } });
    if (result.modifiedCount > 0) {
      await this.db.user.updateOne({ _id: user._id }, { $inc: { authVersion: 1 }, $set: { updatedAt: new Date() } });
      await this.db.auditEvent.create({ actorUserId, action: 'security.session_revoked', targetType: 'session', targetId: sessionId, metadata: { userId: String(user._id), email: user.email }, result: 'success', occurredAt: new Date() });
    }
    return { ok: true, sessionId, revoked: result.modifiedCount > 0 };
  }

  async revokeUserSessions(userId: string, actorUserId?: string, exceptSessionId?: string) {
    if (!Types.ObjectId.isValid(userId)) throw new BadRequestException('Invalid user id');
    const user = await this.db.user.findOne({ _id: userId, accountType: 'SYSTEM' }).lean();
    if (!user) throw new NotFoundException('System administrator not found');
    const filter: any = { userId: String(user._id), revokedAt: { $exists: false } };
    if (exceptSessionId && Types.ObjectId.isValid(exceptSessionId)) filter._id = { $ne: new Types.ObjectId(exceptSessionId) };
    const result = await this.db.session.updateMany(filter, { $set: { revokedAt: new Date(), revokedReason: 'platform_security_bulk_revocation' } });
    await this.db.user.updateOne({ _id: user._id }, { $inc: { authVersion: 1 }, $set: { updatedAt: new Date() } });
    await this.db.auditEvent.create({ actorUserId, action: 'security.sessions_revoked', targetType: 'user', targetId: String(user._id), metadata: { email: user.email, count: result.modifiedCount, exceptSessionId: exceptSessionId ?? null }, result: 'success', occurredAt: new Date() });
    return { ok: true, userId, revoked: result.modifiedCount };
  }

  async loginHistory() {
    const histories = await this.db.loginHistory.find({}).sort({ occurredAt: -1, createdAt: -1 }).limit(500).lean();
    const userIds = [...new Set(histories.map((h: any) => String(h.userId)).filter(Boolean))];
    const users = await this.db.user.find({ _id: { $in: userIds }, accountType: UserAccountType.SYSTEM }).select({ email: 1, firstName: 1, lastName: 1 }).lean();
    const userMap = new Map(users.map((u: any) => [String(u._id), u]));
    const items = histories.filter((h: any) => userMap.has(String(h.userId))).map((h: any) => { const user: any = userMap.get(String(h.userId)); return { id: String(h._id), userId: String(h.userId), email: user.email, name: `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim() || user.email, success: h.success === true, reason: h.reason ?? null, ipAddress: h.ipAddress ?? null, userAgent: h.userAgent ?? null, occurredAt: h.occurredAt ?? h.createdAt }; });
    return { items, summary: { total: items.length, successful: items.filter((x) => x.success).length, failed: items.filter((x) => !x.success).length, uniqueIps: new Set(items.map((x) => x.ipAddress).filter(Boolean)).size } };
  }
}
