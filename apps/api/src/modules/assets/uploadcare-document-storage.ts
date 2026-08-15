import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { createHmac } from 'crypto';
import { DocumentStorage, StoredDocument } from './document-storage';

const UPLOADCARE_API = 'https://api.uploadcare.com';
const UPLOADCARE_UPLOAD = 'https://upload.uploadcare.com/base/';
const UPLOADCARE_ACCEPT = 'application/vnd.uploadcare-v0.7+json';
const DEFAULT_CDN = 'https://ucarecdn.com';

@Injectable()
export class UploadcareDocumentStorage implements DocumentStorage {
  private readonly publicKey = process.env.UPLOADCARE_PUBLIC_KEY?.trim() ?? '';
  private readonly secretKey = process.env.UPLOADCARE_SECRET_KEY?.trim() ?? '';
  private readonly cdnBase = (process.env.UPLOADCARE_CDN_BASE ?? DEFAULT_CDN).replace(/\/$/, '');

  private assertConfigured() {
    if (!this.publicKey || !this.secretKey) {
      throw new ServiceUnavailableException('Document storage is not configured. Set UPLOADCARE_PUBLIC_KEY and UPLOADCARE_SECRET_KEY.');
    }
  }

  async upload(input: { buffer: Buffer; fileName: string; contentType: string }): Promise<StoredDocument> {
    this.assertConfigured();
    const form = new FormData();
    form.append('UPLOADCARE_PUB_KEY', this.publicKey);
    form.append('UPLOADCARE_STORE', 'auto');
    form.append('file', new Blob([new Uint8Array(input.buffer)], { type: input.contentType }), input.fileName);

    const response = await fetch(UPLOADCARE_UPLOAD, { method: 'POST', body: form });
    const body = await this.readJson(response, 'Uploadcare upload failed');
    const key = String(body?.file ?? '');
    if (!key) throw new ServiceUnavailableException('Uploadcare did not return a file identifier');
    return { key, provider: 'uploadcare', url: `${this.cdnBase}/${key}/` };
  }

  async register(uuid: string): Promise<StoredDocument> {
    this.assertConfigured();
    const key = String(uuid ?? '').trim();
    if (!key) throw new ServiceUnavailableException('Uploadcare file identifier is required');

    const method = 'GET';
    const date = new Date().toUTCString();
    const uri = `/files/${encodeURIComponent(key)}/`;
    const signature = createHmac('sha1', this.secretKey).update([method, '', '', date, uri].join('\n')).digest('hex');
    const response = await fetch(`${UPLOADCARE_API}${uri}`, {
      method,
      headers: { Accept: UPLOADCARE_ACCEPT, Date: date, Authorization: `Uploadcare ${this.publicKey}:${signature}` },
    });
    await this.readJson(response, 'Uploadcare file verification failed');
    return { key, provider: 'uploadcare', url: `${this.cdnBase}/${key}/` };
  }

  async download(key: string) {
    this.assertConfigured();
    const response = await fetch(`${this.cdnBase}/${encodeURIComponent(key)}/`);
    if (!response.ok) {
      throw new ServiceUnavailableException(`Stored document could not be downloaded from Uploadcare (${response.status})`);
    }
    return {
      buffer: Buffer.from(await response.arrayBuffer()),
      contentType: response.headers.get('content-type') ?? undefined,
    };
  }

  async remove(key: string) {
    this.assertConfigured();
    const method = 'DELETE';
    const date = new Date().toUTCString();
    const uri = `/files/${encodeURIComponent(key)}/`;
    const signature = createHmac('sha1', this.secretKey).update([method, '', '', date, uri].join('\n')).digest('hex');
    const response = await fetch(`${UPLOADCARE_API}${uri}`, {
      method,
      headers: { Accept: UPLOADCARE_ACCEPT, Date: date, Authorization: `Uploadcare ${this.publicKey}:${signature}` },
    });
    if (!response.ok && response.status !== 404) await this.readJson(response, 'Uploadcare delete failed');
  }

  private async readJson(response: Response, fallback: string): Promise<any> {
    const text = await response.text();
    let body: any = {};
    try { body = text ? JSON.parse(text) : {}; } catch { /* Uploadcare may return plain text. */ }
    if (!response.ok) {
      const detail = body?.detail || body?.error || body?.message || text || `${response.status} ${response.statusText}`;
      throw new ServiceUnavailableException(`${fallback}: ${detail}`);
    }
    return body;
  }
}
