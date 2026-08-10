import { IntegrationConnector, NormalizedDevice, NormalizedGroup, NormalizedUser } from '../integration-connector.interface';
export declare class MockConnector implements IntegrationConnector {
    private connected;
    connect(): Promise<void>;
    validateCredentials(): Promise<boolean>;
    testConnection(): Promise<{
        ok: boolean;
        message: string | undefined;
    }>;
    sync(): Promise<{
        usersProcessed: number;
        devicesProcessed: number;
    }>;
    disconnect(): Promise<void>;
    getUsers(): Promise<NormalizedUser[]>;
    getDevices(): Promise<NormalizedDevice[]>;
    getGroups(): Promise<NormalizedGroup[]>;
    private mockUsers;
    private mockDevices;
}
