import { TenancyService } from './tenancy.service';
declare class CreateCompanyDto {
    name: string;
    code: string;
}
declare class CreateNamedChildDto {
    name: string;
}
export declare class TenancyController {
    private readonly tenancy;
    constructor(tenancy: TenancyService);
    list(req: any): Promise<any[]>;
    create(dto: CreateCompanyDto, req: any): Promise<any>;
    createBusinessUnit(companyId: string, dto: CreateNamedChildDto, req: any): Promise<any>;
    createPlant(businessUnitId: string, dto: CreateNamedChildDto, req: any): Promise<any>;
    createLocation(plantId: string, dto: CreateNamedChildDto, req: any): Promise<any>;
    createDepartment(locationId: string, dto: CreateNamedChildDto, req: any): Promise<any>;
}
export {};
