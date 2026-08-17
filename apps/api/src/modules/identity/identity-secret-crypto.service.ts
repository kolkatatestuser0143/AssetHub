import { Injectable } from '@nestjs/common';
import * as crypto from 'crypto';

const VERSION = 'v1';

@Injectable()
export class IdentitySecretCryptoService {
  private readonly key: Buffer;

  constructor() {
    const raw = process.env.IDP_CONFIG_ENCRYPTION_KEY?.trim();
    if (raw) {
      const key = Buffer.from(raw, 'base64');
      if (key.length !== 32) throw new Error('IDP_CONFIG_ENCRYPTION_KEY must be a base64-encoded 32-byte key');
      this.key = key;
      return;
    }
    if (process.env.NODE_ENV === 'production') throw new Error('IDP_CONFIG_ENCRYPTION_KEY is required in production');
    this.key = crypto.createHash('sha256').update(process.env.JWT_ACCESS_SECRET ?? 'assethub-development-idp-encryption-key').digest();
  }

  encrypt(config: Record<string, unknown>): Record<string, unknown> {
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv('aes-256-gcm', this.key, iv);
    const ciphertext = Buffer.concat([cipher.update(JSON.stringify(config), 'utf8'), cipher.final()]);
    return { __encrypted: VERSION, iv: iv.toString('base64'), tag: cipher.getAuthTag().toString('base64'), ciphertext: ciphertext.toString('base64') };
  }

  decrypt(value: Record<string, unknown>): { config: Record<string, unknown>; encrypted: boolean } {
    if (value?.__encrypted !== VERSION) return { config: value, encrypted: false };
    try {
      const decipher = crypto.createDecipheriv('aes-256-gcm', this.key, Buffer.from(String(value.iv), 'base64'));
      decipher.setAuthTag(Buffer.from(String(value.tag), 'base64'));
      const plaintext = Buffer.concat([decipher.update(Buffer.from(String(value.ciphertext), 'base64')), decipher.final()]).toString('utf8');
      const config = JSON.parse(plaintext);
      if (!config || typeof config !== 'object' || Array.isArray(config)) throw new Error('Invalid encrypted IDP config');
      return { config, encrypted: true };
    } catch {
      throw new Error('Unable to decrypt identity provider configuration');
    }
  }
}
