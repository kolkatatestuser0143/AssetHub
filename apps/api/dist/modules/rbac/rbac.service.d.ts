import { MongooseDatabaseService } from '../../common/mongoose-database.service';
import { AuthContext } from '../../common/guards/tenant-context.guard';
export declare class RbacService {
    private readonly db;
    constructor(db: MongooseDatabaseService);
    listPermissions(): Promise<any[]>;
    listRoles(auth: AuthContext): Promise<any[]>;
    createRole(auth: AuthContext, name: string, permissionKeys: string[]): Promise<any>;
    assignRole(userId: string, roleId: string): Promise<any>;
}
