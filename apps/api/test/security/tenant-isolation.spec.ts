import { PrismaClient } from '@prisma/client';
import { PrismaService } from '../../src/common/prisma.service';
import { TenancyService } from '../../src/modules/tenancy/tenancy.service';
import { AssetsService } from '../../src/modules/assets/assets.service';
import { cleanupTenants, seedTwoTenants } from './isolation-fixture';

/**
 * This suite is the non-optional CI gate flagged throughout the
 * architecture doc (§3, §5) and the scaffold README. It doesn't test
 * feature correctness — it tests that a caller authenticated as
 * Tenant A can NEVER read or write Tenant B's data, even by directly
 * substituting Tenant B's IDs into an otherwise-valid request. If any
 * test here fails, that is a security incident, not a bug ticket —
 * fix before merging, never skip/xfail these.
 *
 * Requires a real Postgres test database (DATABASE_URL pointed at a
 * disposable DB) with migrations applied, including the RLS policy
 * migration. Run: `pnpm exec jest test/security --runInBand`.
 */
describe('Cross-tenant isolation', () => {
  let prisma: PrismaService;
  let tenancy: TenancyService;
  let assets: AssetsService;
  let fixture: Awaited<ReturnType<typeof seedTwoTenants>>;

  beforeAll(async () => {
    prisma = new PrismaService();
    await prisma.onModuleInit();
    tenancy = new TenancyService(prisma);
    assets = new AssetsService(prisma);
  });

  afterAll(async () => {
    await prisma.onModuleDestroy();
  });

  beforeEach(async () => {
    fixture = await seedTwoTenants(prisma as unknown as PrismaClient);
  });

  afterEach(async () => {
    await cleanupTenants(prisma as unknown as PrismaClient, [fixture.tenantA.id, fixture.tenantB.id]);
  });

  it('User B cannot list Company A via a scoped query (application-level filter)', async () => {
    const companies = await tenancy.listCompanies(fixture.authB);
    expect(companies.find((c) => c.id === fixture.companyA.id)).toBeUndefined();
  });

  it('User B cannot create a BusinessUnit under Company A by ID substitution', async () => {
    await expect(
      tenancy.createBusinessUnit(fixture.authB, fixture.companyA.id, 'Malicious BU'),
    ).rejects.toThrow(/out of scope/i);
  });

  it('User B cannot create an asset against Company A\'s asset type', async () => {
    // Caught a real gap during authoring: assetTypeId is caller-supplied
    // input. AssetsService.createAsset now explicitly verifies the
    // asset type belongs to the caller's own company before proceeding
    // — see the comment in assets.service.ts. This test is what would
    // have caught the gap if it had shipped unfixed; keep it even
    // though it currently passes, it's guarding a real regression risk.
    await expect(
      assets.createAsset(fixture.authB, fixture.assetTypeA.id, {}),
    ).rejects.toThrow(/does not belong to your company/i);
  });

  it('RLS blocks a direct read of Tenant A rows even without app-level filtering', async () => {
    // Bypass the service layer entirely — set the Postgres session to
    // Tenant B's context and attempt a raw, unfiltered query for
    // Tenant A's company. This is what proves the backstop (not just
    // the primary defense) actually works.
    const result = await prisma.withTenantContext(fixture.tenantB.id, fixture.companyB.id, async (tx) => {
      return (tx as any).company.findUnique({ where: { id: fixture.companyA.id } });
    });
    expect(result).toBeNull();
  });

  it('Tenant-admin (crossCompany) on Tenant A still cannot see Tenant B', async () => {
    const tenantAdminAuth = { ...fixture.authA, crossCompany: true };
    const companies = await tenancy.listCompanies(tenantAdminAuth);
    expect(companies.every((c) => c.id !== fixture.companyB.id)).toBe(true);
  });

  it('RLS also blocks a raw, unfiltered read of another tenant\'s AssetType', async () => {
    // Direct regression test for the AssetType/AssetNumberingRule gap
    // found while writing this suite (see migration.sql comment) —
    // proves the RLS backstop covers it too, not just the app-level
    // check in AssetsService.
    const result = await prisma.withTenantContext(fixture.tenantB.id, fixture.companyB.id, async (tx) => {
      return (tx as any).assetType.findUnique({ where: { id: fixture.assetTypeA.id } });
    });
    expect(result).toBeNull();
  });

  it('listAssets scopes correctly and never returns another tenant\'s assets', async () => {
    // New query path added alongside the frontend build-out — covered
    // here rather than assumed safe by analogy to listCompanies.
    const assetA = await assets.createAsset(fixture.authA, fixture.assetTypeA.id, {});
    await assets.createAsset(fixture.authB, fixture.assetTypeB.id, {});

    const resultsForA = await assets.listAssets(fixture.authA);
    expect(resultsForA.map((a) => a.id)).toContain(assetA.id);
    expect(resultsForA.every((a) => a.companyId === fixture.companyA.id)).toBe(true);
  });
});
