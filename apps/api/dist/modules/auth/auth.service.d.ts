import { MongooseDatabaseService } from '../../common/mongoose-database.service';
import { SessionService } from './session.service';
export declare class AuthService {
    private readonly db;
    private readonly sessions;
    constructor(db: MongooseDatabaseService, sessions: SessionService);
    hashPassword(plain: string): Promise<string>;
    login(email: string, password: string, ip: string, userAgent: string): Promise<{
        accessToken: string;
        refreshToken: string;
        sessionId: string;
        accountType: any;
    }>;
    systemLogin(email: string, password: string, ip: string, userAgent: string): Promise<{
        accessToken: string;
        refreshToken: string;
        sessionId: string;
        accountType: any;
    }>;
    refresh(rawRefreshToken: string, ip: string, userAgent: string): Promise<{
        accessToken: string;
        refreshToken: string;
        sessionId: string;
        accountType: any;
    }>;
    logout(sessionId: string, userId: string): Promise<void>;
    private resolveSystemPermissions;
    private recordLoginAttempt;
}
