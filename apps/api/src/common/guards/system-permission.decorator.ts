import { SetMetadata } from '@nestjs/common';

export const SYSTEM_PERMISSION_KEY = 'systemPermission';
export const SystemPermission = (permission: string) => SetMetadata(SYSTEM_PERMISSION_KEY, permission);
