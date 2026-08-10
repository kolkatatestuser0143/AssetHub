import { SetMetadata } from '@nestjs/common';

export const PERMISSION_KEY = 'requiredPermission';

/**
 * Usage: @RequirePermission('asset:bulk_update')
 * Resource+action model, not hardcoded per-module (architecture doc §6).
 */
export const RequirePermission = (permission: string) => SetMetadata(PERMISSION_KEY, permission);
