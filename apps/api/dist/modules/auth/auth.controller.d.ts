import { AuthService } from './auth.service';
import { LoginDto, RefreshDto } from './auth.dto';
export declare class AuthController {
    private readonly authService;
    constructor(authService: AuthService);
    login(dto: LoginDto, req: any): Promise<{
        accessToken: string;
        refreshToken: string;
        sessionId: string;
        accountType: any;
    }>;
    systemLogin(dto: LoginDto, req: any): Promise<{
        accessToken: string;
        refreshToken: string;
        sessionId: string;
        accountType: any;
    }>;
    refresh(dto: RefreshDto, req: any): Promise<{
        accessToken: string;
        refreshToken: string;
        sessionId: string;
        accountType: any;
    }>;
    logout(req: any): Promise<{
        ok: boolean;
    }>;
}
