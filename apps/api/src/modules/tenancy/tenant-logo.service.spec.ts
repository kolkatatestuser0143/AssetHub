import { BadRequestException, ServiceUnavailableException } from '@nestjs/common';
import { TenantLogoService } from './tenant-logo.service';

describe('TenantLogoService', () => {
  const tenantId = 'tenant-a';
  const auth = { tenantId, userId: 'user-a' } as any;
  let db: any;
  let service: TenantLogoService;
  const originalFetch = global.fetch;

  beforeEach(() => {
    process.env.UPLOADCARE_PUBLIC_KEY = 'public-key';
    process.env.UPLOADCARE_SECRET_KEY = 'secret-key';
    db = {
      tenant: {
        findById: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: tenantId }) }),
        findByIdAndUpdate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ logoFileId: 'a'.repeat(32), logoUrl: 'https://ucarecdn.com/logo/' }) }),
        updateOne: jest.fn().mockResolvedValue({ acknowledged: true }),
      },
      auditEvent: { create: jest.fn().mockResolvedValue({}) },
    };
    service = new TenantLogoService(db);
  });

  afterEach(() => { global.fetch = originalFetch; });

  it('fails clearly when Uploadcare credentials are absent', async () => {
    delete process.env.UPLOADCARE_PUBLIC_KEY;
    delete process.env.UPLOADCARE_SECRET_KEY;
    service = new TenantLogoService(db);
    await expect(service.setLogo(auth, 'a'.repeat(32))).rejects.toBeInstanceOf(ServiceUnavailableException);
  });

  it('rejects a verified non-image Uploadcare file', async () => {
    global.fetch = jest.fn().mockResolvedValue(new Response(JSON.stringify({ mime_type: 'application/pdf', size: 100, original_filename: 'x.pdf' }), { status: 200, headers: { 'content-type': 'application/json' } })) as any;
    await expect(service.setLogo(auth, 'a'.repeat(32))).rejects.toBeInstanceOf(BadRequestException);
    expect(db.tenant.findByIdAndUpdate).not.toHaveBeenCalled();
  });

  it('stores a verified image and writes an audit event', async () => {
    global.fetch = jest.fn().mockResolvedValue(new Response(JSON.stringify({ mime_type: 'image/png', size: 100, original_filename: 'logo.png' }), { status: 200, headers: { 'content-type': 'application/json' } })) as any;
    const result = await service.setLogo(auth, 'a'.repeat(32));
    expect(result.logoFileId).toBe('a'.repeat(32));
    expect(db.tenant.findByIdAndUpdate).toHaveBeenCalledWith(tenantId, expect.objectContaining({ $set: expect.objectContaining({ logoFileId: 'a'.repeat(32) }) }), expect.anything());
    expect(db.auditEvent.create).toHaveBeenCalledWith(expect.objectContaining({ action: 'tenant.logo_updated', tenantId }));
  });
});
