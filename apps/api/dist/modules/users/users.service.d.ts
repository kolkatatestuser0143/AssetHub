import { MongooseDatabaseService } from '../../common/mongoose-database.service';
import { AuthContext } from '../../common/guards/tenant-context.guard';
import { TenantScopedRepository } from '../../common/tenant-scoped.repository';
export declare class UsersService extends TenantScopedRepository {
    private readonly db;
    constructor(db: MongooseDatabaseService);
    private safe;
    list(auth: AuthContext): Promise<any[]>;
    get(auth: AuthContext, userId: string): Promise<any>;
    create(auth: AuthContext, input: {
        email: string;
        firstName: string;
        lastName: string;
        companyId?: string;
        jobTitle?: string;
        phone?: string;
        departmentId?: string;
        locationId?: string;
    }): Promise<any>;
    setActive(auth: AuthContext, userId: string, active: boolean): Promise<any>;
    sessions(auth: AuthContext, userId: string): Promise<any[]>;
    loginHistory(auth: AuthContext, userId: string): Promise<any[]>;
    revokeSession(auth: AuthContext, userId: string, sessionId: string, actorUserId: string): Promise<{
        ok: boolean;
        sessionId: string;
    }>;
}
