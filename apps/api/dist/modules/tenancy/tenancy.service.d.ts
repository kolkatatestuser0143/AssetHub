import { MongooseDatabaseService } from '../../common/mongoose-database.service';
import { AuthContext } from '../../common/guards/tenant-context.guard';
import { TenantScopedRepository } from '../../common/tenant-scoped.repository';
export declare class TenancyService extends TenantScopedRepository {
    private readonly db;
    constructor(db: MongooseDatabaseService);
    listCompanies(auth: AuthContext): Promise<any[]>;
    createCompany(auth: AuthContext, name: string, code: string): Promise<any>;
    listBusinessUnits(auth: AuthContext, companyId: string): Promise<any[]>;
    createBusinessUnit(auth: AuthContext, companyId: string, name: string): Promise<any>;
    listPlants(auth: AuthContext, businessUnitId: string): Promise<any[]>;
    createPlant(auth: AuthContext, businessUnitId: string, name: string): Promise<any>;
    listLocations(auth: AuthContext, plantId: string): Promise<any[]>;
    createLocation(auth: AuthContext, plantId: string, name: string): Promise<any>;
    listDepartments(auth: AuthContext, locationId: string): Promise<any[]>;
    createDepartment(auth: AuthContext, locationId: string, name: string): Promise<any>;
    private assertCompanyInScope;
}
