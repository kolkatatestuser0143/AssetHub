import { RbacService } from './rbac.service';
declare class CreateRoleDto {
    name: string;
    permissionKeys: string[];
}
export declare class RbacController {
    private readonly rbac;
    constructor(rbac: RbacService);
    listPermissions(): Promise<any[]>;
    listRoles(req: any): Promise<any[]>;
    createRole(dto: CreateRoleDto, req: any): Promise<any>;
    assignRole(roleId: string, userId: string): Promise<any>;
}
export {};
