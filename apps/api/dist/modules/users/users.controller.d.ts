import { UsersService } from './users.service';
declare class CreateUserDto {
    email: string;
    firstName: string;
    lastName: string;
    companyId?: string;
    jobTitle?: string;
    phone?: string;
    departmentId?: string;
    locationId?: string;
}
export declare class UsersController {
    private readonly users;
    constructor(users: UsersService);
    list(req: any): Promise<any[]>;
    get(userId: string, req: any): Promise<any>;
    create(dto: CreateUserDto, req: any): Promise<any>;
    activate(userId: string, req: any): Promise<any>;
    deactivate(userId: string, req: any): Promise<any>;
}
export {};
