import { MongooseDatabaseService } from '../../common/mongoose-database.service';
import { AuthContext } from '../../common/guards/tenant-context.guard';
import { TenantScopedRepository } from '../../common/tenant-scoped.repository';
export declare class RbacService extends TenantScopedRepository {
    private readonly db;
    constructor(db: MongooseDatabaseService);
    listPermissions(): Promise<any[]>;
    listRoles(auth: AuthContext): Promise<any[]>;
    createRole(auth: AuthContext, name: string, permissionKeys: string[]): Promise<any>;
    assignRole(auth: AuthContext, userId: string, roleId: string): Promise<any>;
}
