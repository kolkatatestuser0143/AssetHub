import { AuthContext } from './guards/tenant-context.guard';
export declare abstract class TenantScopedRepository {
    protected scope(auth: AuthContext): {
        tenantId: string;
        companyId?: string;
    };
}
