"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SessionService = void 0;
const common_1 = require("@nestjs/common");
const jwt_1 = require("@nestjs/jwt");
const crypto = __importStar(require("crypto"));
const mongoose_database_service_1 = require("../../common/mongoose-database.service");
const mongoose_utils_1 = require("../../common/mongoose.utils");
const ACCESS_TOKEN_TTL = '10m';
const REFRESH_TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000;
let SessionService = class SessionService {
    constructor(db, jwt) {
        this.db = db;
        this.jwt = jwt;
    }
    async issueSession(userId, ip, userAgent) {
        const rawUser = await this.db.findByIdOrThrow(this.db.user, userId, 'User');
        const permissions = await this.resolvePermissions(rawUser.roleIds ?? []);
        const accessToken = this.jwt.sign({
            sub: rawUser.id,
            tenantId: rawUser.tenantId,
            companyId: rawUser.companyId,
            permissions,
        }, { expiresIn: ACCESS_TOKEN_TTL });
        const rawRefreshToken = crypto.randomBytes(48).toString('hex');
        const session = await this.db.session.create({
            userId: rawUser.id,
            refreshTokenHash: this.hashToken(rawRefreshToken),
            ipAddress: ip,
            userAgent,
            lastSeenAt: new Date(),
            expiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL_MS),
        });
        return { accessToken, refreshToken: rawRefreshToken, sessionId: String(session._id) };
    }
    async revokeSession(sessionId, reason) {
        await this.db.session.updateOne({ _id: sessionId }, { $set: { revokedAt: new Date(), revokedReason: reason } });
    }
    async findByRefreshToken(rawRefreshToken) {
        const doc = await this.db.session
            .findOne({ refreshTokenHash: this.hashToken(rawRefreshToken) })
            .lean();
        return doc ? (0, mongoose_utils_1.toDto)(doc) : null;
    }
    hashToken(raw) {
        return crypto.createHash('sha256').update(raw).digest('hex');
    }
    async resolvePermissions(roleIds) {
        if (roleIds.length === 0)
            return [];
        const roles = await this.db.role
            .find({ _id: { $in: roleIds } })
            .lean();
        const perms = new Set();
        for (const role of roles) {
            for (const rp of role.permissions ?? [])
                perms.add(rp.permissionKey);
        }
        return [...perms];
    }
};
exports.SessionService = SessionService;
exports.SessionService = SessionService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [mongoose_database_service_1.MongooseDatabaseService,
        jwt_1.JwtService])
], SessionService);
//# sourceMappingURL=session.service.js.map