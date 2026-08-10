import { Injectable, OnModuleDestroy } from '@nestjs/common';
import Redis from 'ioredis';

/**
 * Backs two security-critical, easy-to-get-wrong things:
 *  1. OIDC state/nonce/PKCE verifier storage between the redirect and
 *     the callback (must not be guessable, must be single-use).
 *  2. SAML assertion-ID replay protection (an assertion must be
 *     rejected if its ID has been seen before, within its validity
 *     window) — architecture doc §8.
 *
 * Both need a real shared store (not in-process memory) the moment
 * there's more than one API instance, so this goes straight to Redis
 * rather than a Map, even in this scaffold.
 */
@Injectable()
export class IdentitySecurityCacheService implements OnModuleDestroy {
  private redis = new Redis(process.env.REDIS_URL ?? 'redis://localhost:6379');

  async onModuleDestroy() {
    await this.redis.quit();
  }

  async setOnce(key: string, ttlSeconds: number): Promise<boolean> {
    // NX = only set if not already present. Returns null if the key
    // existed — that's the "already used" / "replay" signal.
    const result = await this.redis.set(key, '1', 'EX', ttlSeconds, 'NX');
    return result === 'OK';
  }

  async storeValue(key: string, value: string, ttlSeconds: number): Promise<void> {
    await this.redis.set(key, value, 'EX', ttlSeconds);
  }

  async takeValue(key: string): Promise<string | null> {
    // Single-use: read and delete atomically so a state/nonce value
    // can never be reused even if a callback fires twice.
    const value = await this.redis.get(key);
    if (value !== null) await this.redis.del(key);
    return value;
  }
}
