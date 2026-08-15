export const DOCUMENT_STORAGE = Symbol('DOCUMENT_STORAGE');

export interface StoredDocument {
  key: string;
  url: string;
  provider: string;
}

export interface DocumentStorage {
  upload(input: {
    buffer: Buffer;
    fileName: string;
    contentType: string;
  }): Promise<StoredDocument>;
  register(uuid: string): Promise<StoredDocument>;
  download(key: string): Promise<{
    buffer: Buffer;
    contentType?: string;
    fileName?: string;
  }>;
  remove(key: string): Promise<void>;
}
