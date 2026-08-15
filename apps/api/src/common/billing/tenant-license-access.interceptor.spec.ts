import { ForbiddenException } from '@nestjs/common';
import { TenantLicenseAccessInterceptor } from './tenant-license-access.interceptor';

describe('TenantLicenseAccessInterceptor', () => {
  const next = { handle: jest.fn(() => 'next') } as any;
  const context = (auth: any, url: string) => ({
    switchToHttp: () => ({ getRequest: () => ({ authContext: auth, originalUrl: url, url }) }),
  }) as any;

  beforeEach(() => jest.clearAllMocks());

  it('does not apply tenant license checks to public requests', async () => {
    const entitlement = { getActiveSubscription: jest.fn() } as any;
    const interceptor = new TenantLicenseAccessInterceptor(entitlement);

    await expect(interceptor.intercept(context(undefined, '/api/v1/auth/login'), next)).resolves.toBe('next');
    expect(entitlement.getActiveSubscription).not.toHaveBeenCalled();
  });

  it('allows an authenticated tenant to inspect its license after expiry', async () => {
    const entitlement = { getActiveSubscription: jest.fn() } as any;
    const interceptor = new TenantLicenseAccessInterceptor(entitlement);

    await expect(interceptor.intercept(context({ tenantId: 'tenant-1' }, '/api/v1/billing/license'), next)).resolves.toBe('next');
    expect(entitlement.getActiveSubscription).not.toHaveBeenCalled();
  });

  it('requires an active subscription for normal tenant APIs', async () => {
    const entitlement = { getActiveSubscription: jest.fn().mockResolvedValue({ _id: 'sub-1' }) } as any;
    const interceptor = new TenantLicenseAccessInterceptor(entitlement);

    await expect(interceptor.intercept(context({ tenantId: 'tenant-1' }, '/api/v1/assets'), next)).resolves.toBe('next');
    expect(entitlement.getActiveSubscription).toHaveBeenCalledWith('tenant-1');
  });

  it('returns the license-service forbidden error unchanged', async () => {
    const entitlement = { getActiveSubscription: jest.fn().mockRejectedValue(new ForbiddenException('Tenant license has expired')) } as any;
    const interceptor = new TenantLicenseAccessInterceptor(entitlement);

    await expect(interceptor.intercept(context({ tenantId: 'tenant-1' }, '/api/v1/assets'), next)).rejects.toThrow('Tenant license has expired');
  });
});
