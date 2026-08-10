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
exports.AuthService = void 0;
const common_1 = require("@nestjs/common");
const argon2 = __importStar(require("argon2"));
const mongoose_database_service_1 = require("../../common/mongoose-database.service");
const session_service_1 = require("./session.service");
const mongoose_utils_1 = require("../../common/mongoose.utils");
let AuthService = class AuthService {
    constructor(db, sessions) {
        this.db = db;
        this.sessions = sessions;
    }
    async hashPassword(plain) {
        return argon2.hash(plain, { type: argon2.argon2id });
    }
    async login(email, password, ip, userAgent) {
        const userDoc = await this.db.user
            .findOne({ email })
            .lean();
        const user = userDoc ? (0, mongoose_utils_1.toDto)(userDoc) : null;
        if (!user || !user.passwordHash || !(await argon2.verify(user.passwordHash, password))) {
            await this.recordLoginAttempt(user?.id ?? null, false, ip, userAgent, 'invalid_credentials');
            throw new common_1.UnauthorizedException('Invalid email or password');
        }
        if (!user.isActive) {
            await this.recordLoginAttempt(user.id, false, ip, userAgent, 'account_inactive');
            throw new common_1.UnauthorizedException('Account is inactive');
        }
        await this.recordLoginAttempt(user.id, true, ip, userAgent, null);
        return this.sessions.issueSession(user.id, ip, userAgent);
    }
    async refresh(rawRefreshToken, ip, userAgent) {
        const session = await this.sessions.findByRefreshToken(rawRefreshToken);
        if (!session || session.revokedAt || session.expiresAt < new Date()) {
            throw new common_1.UnauthorizedException('Invalid refresh token');
        }
        await this.sessions.revokeSession(session.id, 'rotated');
        return this.sessions.issueSession(session.userId, ip, userAgent);
    }
    async logout(sessionId) {
        await this.sessions.revokeSession(sessionId, 'user_logout');
    }
    async recordLoginAttempt(userId, success, ip, userAgent, reason) {
        if (!userId)
            return;
        await this.db.loginHistory.create({
            userId,
            success,
            ipAddress: ip,
            userAgent,
            reason: reason ?? undefined,
            occurredAt: new Date(),
        });
    }
};
exports.AuthService = AuthService;
exports.AuthService = AuthService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [mongoose_database_service_1.MongooseDatabaseService,
        session_service_1.SessionService])
], AuthService);
//# sourceMappingURL=auth.service.js.map