"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.IdentitySecurityCacheService = void 0;
const common_1 = require("@nestjs/common");
const ioredis_1 = __importDefault(require("ioredis"));
let IdentitySecurityCacheService = class IdentitySecurityCacheService {
    constructor() {
        this.redis = new ioredis_1.default(process.env.REDIS_URL ?? 'redis://localhost:6379');
    }
    async onModuleDestroy() {
        await this.redis.quit();
    }
    async setOnce(key, ttlSeconds) {
        const result = await this.redis.set(key, '1', 'EX', ttlSeconds, 'NX');
        return result === 'OK';
    }
    async storeValue(key, value, ttlSeconds) {
        await this.redis.set(key, value, 'EX', ttlSeconds);
    }
    async takeValue(key) {
        const value = await this.redis.get(key);
        if (value !== null)
            await this.redis.del(key);
        return value;
    }
};
exports.IdentitySecurityCacheService = IdentitySecurityCacheService;
exports.IdentitySecurityCacheService = IdentitySecurityCacheService = __decorate([
    (0, common_1.Injectable)()
], IdentitySecurityCacheService);
//# sourceMappingURL=identity-security-cache.service.js.map