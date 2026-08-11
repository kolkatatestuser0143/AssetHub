import { CanActivate, ExecutionContext } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
export interface AuthContext {
    userId: string;
    sessionId: string;
    tenantId: string;
    companyId: string;
    crossCompany: boolean;
    permissions: string[];
}
export declare class TenantContextGuard implements CanActivate {
    private readonly jwt;
    constructor(jwt: JwtService);
    canActivate(context: ExecutionContext): boolean;
}
