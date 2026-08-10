import { AuthService } from './auth.service';
import { LoginDto, RefreshDto } from './auth.dto';
export declare class AuthController {
    private readonly authService;
    constructor(authService: AuthService);
    login(dto: LoginDto, req: any): Promise<{
        accessToken: string;
        refreshToken: string;
        sessionId: string;
    }>;
    refresh(dto: RefreshDto, req: any): Promise<{
        accessToken: string;
        refreshToken: string;
        sessionId: string;
    }>;
    logout(req: any): Promise<{
        ok: boolean;
    }>;
}
