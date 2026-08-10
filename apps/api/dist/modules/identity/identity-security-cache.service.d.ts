import { OnModuleDestroy } from '@nestjs/common';
export declare class IdentitySecurityCacheService implements OnModuleDestroy {
    private redis;
    onModuleDestroy(): Promise<void>;
    setOnce(key: string, ttlSeconds: number): Promise<boolean>;
    storeValue(key: string, value: string, ttlSeconds: number): Promise<void>;
    takeValue(key: string): Promise<string | null>;
}
