import { JwtService } from '@nestjs/jwt';
import { MongooseDatabaseService } from '../../common/mongoose-database.service';
export declare class SessionService {
    private readonly db;
    private readonly jwt;
    constructor(db: MongooseDatabaseService, jwt: JwtService);
    issueSession(userId: string, ip: string, userAgent: string, system?: boolean): Promise<{
        accessToken: string;
        refreshToken: string;
        sessionId: string;
        accountType: any;
    }>;
    isSystemUser(userId: string): Promise<boolean>;
    revokeSession(sessionId: string, userId: string, reason: string): Promise<void>;
    findByRefreshToken(rawRefreshToken: string): Promise<any>;
    hashToken(raw: string): string;
    private resolvePermissions;
    private resolveSystemPermissions;
}
