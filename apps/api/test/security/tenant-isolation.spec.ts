import { TenancyService } from '../../src/modules/tenancy/tenancy.service';
import { AssetsService } from '../../src/modules/assets/assets.service';
import { EntitlementService } from '../../src/modules/billing/entitlement.service';
import { SiteType } from '../../src/models/tenancy.schemas';
import { connectTestDb, seedTwoTenants } from './isolation-fixture';

type Fixture = Awaited<ReturnType<typeof seedTwoTenants>>;

const testEntitlements = {
  requireWithinLimit: async () => true,
} as unknown as EntitlementService;

describe('Cross-tenant isolation', () => {
  let testDb: Awaited<ReturnType<typeof connectTestDb>>;
  let tenancy: TenancyService;
  let assets: AssetsService;
  let fixture: Fixture;

  beforeAll(async () => {
    testDb = await connectTestDb();
    tenancy = new TenancyService(testDb.db, testEntitlements);
    assets = new AssetsService(testDb.db, testEntitlements);
  });

  afterAll(async () => { await testDb.disconnect(); });

  beforeEach(async () => {
    await testDb.clearTestCollections();
    fixture = await seedTwoTenants(testDb.db);
  });

  it('User B cannot list Company A via a scoped query', async () => {
    const companies = await tenancy.listCompanies(fixture.authB);
    expect(companies.find((c) => c.id === fixture.companyA.id)).toBeUndefined();
  });

  it('User B cannot create a Site under Company A by ID substitution', async () => {
    await expect(
      tenancy.createPlant(fixture.authB, fixture.companyA.id, 'Malicious Site', SiteType.PLANT),
    ).rejects.toThrow(/not found|out of scope/i);
  });

  it("User B cannot create an asset against Company A's asset type", async () => {
    await expect(
      assets.createAsset(fixture.authB, fixture.assetTypeA.id, {}),
    ).rejects.toThrow(/does not belong to your company/i);
  });

  it('Tenant A RLS context cannot read Tenant B company data', async () => {
    const companyBFromA = await testDb.db.withTenantContext(
      fixture.tenantA.id,
      fixture.companyA.id,
      (tx) => tx.company.findUnique({ where: { id: fixture.companyB.id } }),
    );
    expect(companyBFromA).toBeNull();
  });

  it('A database query without tenant context cannot read tenant-scoped rows', async () => {
    const rows = await testDb.db.$queryRaw<Array<{ id: string }>>`
      SELECT id FROM companies WHERE id = ${fixture.companyA.id}::uuid
    `;
    expect(rows).toHaveLength(0);
  });

  it('Tenant-admin crossCompany on Tenant A still cannot see Tenant B', async () => {
    const tenantAdminAuth = { ...fixture.authA, crossCompany: true };
    const companies = await tenancy.listCompanies(tenantAdminAuth);
    expect(companies.every((c) => c.id !== fixture.companyB.id)).toBe(true);
  });

  it('listAssets scopes correctly and never returns another tenant assets', async () => {
    const assetA = await assets.createAsset(fixture.authA, fixture.assetTypeA.id, {});
    await assets.createAsset(fixture.authB, fixture.assetTypeB.id, {});
    const resultsForA = await assets.listAssets(fixture.authA);
    expect(resultsForA.map((a) => a.id)).toContain(assetA.id);
    expect(resultsForA.every((a) => a.companyId === fixture.companyA.id)).toBe(true);
  });
});
