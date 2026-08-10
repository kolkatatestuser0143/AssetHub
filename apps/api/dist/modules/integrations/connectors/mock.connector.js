"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MockConnector = void 0;
class MockConnector {
    constructor() {
        this.connected = false;
        this.mockUsers = [
            { externalId: 'ext-1', email: 'mock.user@example.com', firstName: 'Mock', lastName: 'User' },
        ];
        this.mockDevices = [
            { externalId: 'dev-1', hostname: 'MOCK-LAPTOP-01', assignedUserExternalId: 'ext-1' },
        ];
    }
    async connect() {
        this.connected = true;
    }
    async validateCredentials() {
        return true;
    }
    async testConnection() {
        return { ok: this.connected, message: this.connected ? undefined : 'not connected' };
    }
    async sync() {
        return { usersProcessed: this.mockUsers.length, devicesProcessed: this.mockDevices.length };
    }
    async disconnect() {
        this.connected = false;
    }
    async getUsers() {
        return this.mockUsers;
    }
    async getDevices() {
        return this.mockDevices;
    }
    async getGroups() {
        return [{ externalId: 'grp-1', name: 'IT Staff', memberExternalIds: ['ext-1'] }];
    }
}
exports.MockConnector = MockConnector;
//# sourceMappingURL=mock.connector.js.map