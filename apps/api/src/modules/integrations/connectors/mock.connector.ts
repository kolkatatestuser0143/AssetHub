import {
  IntegrationConnector,
  NormalizedDevice,
  NormalizedGroup,
  NormalizedUser,
} from '../integration-connector.interface';

export class MockConnector implements IntegrationConnector {
  private connected = false;

  async connect(): Promise<void> {
    this.connected = true;
  }
  async validateCredentials(): Promise<boolean> {
    return true;
  }
  async testConnection() {
    return { ok: this.connected, message: this.connected ? undefined : 'not connected' };
  }
  async sync() {
    return { usersProcessed: this.mockUsers.length, devicesProcessed: this.mockDevices.length };
  }
  async disconnect(): Promise<void> {
    this.connected = false;
  }
  async getUsers(): Promise<NormalizedUser[]> {
    return this.mockUsers;
  }
  async getDevices(): Promise<NormalizedDevice[]> {
    return this.mockDevices;
  }
  async getGroups(): Promise<NormalizedGroup[]> {
    return [{ externalId: 'grp-1', name: 'IT Staff', memberExternalIds: ['ext-1'] }];
  }

  private mockUsers: NormalizedUser[] = [
    { externalId: 'ext-1', email: 'mock.user@example.com', firstName: 'Mock', lastName: 'User' },
  ];
  private mockDevices: NormalizedDevice[] = [
    { externalId: 'dev-1', hostname: 'MOCK-LAPTOP-01', assignedUserExternalId: 'ext-1' },
  ];
}

// TODO(real adapters): JumpCloud first — see architecture doc §17
// open decision #3. Implement JumpCloudConnector against the same
// interface; register in an adapter factory keyed by
// IntegrationInstance.provider. Do not special-case JumpCloud logic
// anywhere outside that one file.
