import { JwtService } from '@nestjs/jwt';
import { MongooseDatabaseService } from '../../common/mongoose-database.service';
export declare class SessionService {
    private readonly db;
    private readonly jwt;
    constructor(db: MongooseDatabaseService, jwt: JwtService);
    issueSession(userId: string, ip: string, userAgent: string): Promise<{
        accessToken: string;
        refreshToken: string;
        sessionId: string;
    }>;
    revokeSession(sessionId: string, userId: string, reason: string): Promise<void>;
    findByRefreshToken(rawRefreshToken: string): Promise<any>;
    hashToken(raw: string): string;
    private resolvePermissions;
}
