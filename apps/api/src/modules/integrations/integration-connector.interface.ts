// Architecture doc §11 / master prompt §58.
// Every real vendor adapter (JumpCloud, Entra, etc.) AND every mock
// implements this same interface — the `integrations` module itself
// never contains vendor-specific logic.

export interface NormalizedUser {
  externalId: string;
  email: string;
  firstName: string;
  lastName: string;
  department?: string;
}

export interface NormalizedDevice {
  externalId: string;
  hostname: string;
  serialNumber?: string;
  assignedUserExternalId?: string;
}

export interface NormalizedGroup {
  externalId: string;
  name: string;
  memberExternalIds: string[];
}

export interface IntegrationConnector {
  connect(config: Record<string, unknown>): Promise<void>;
  validateCredentials(): Promise<boolean>;
  testConnection(): Promise<{ ok: boolean; message?: string }>;
  sync(): Promise<{ usersProcessed: number; devicesProcessed: number }>;
  disconnect(): Promise<void>;
  getUsers(): Promise<NormalizedUser[]>;
  getDevices(): Promise<NormalizedDevice[]>;
  getGroups(): Promise<NormalizedGroup[]>;
}
