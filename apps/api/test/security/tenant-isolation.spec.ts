import { TenancyService } from '../../src/modules/tenancy/tenancy.service';
import { AssetsService } from '../../src/modules/assets/assets.service';
import { SiteType } from '../../src/models/tenancy.schemas';
import { connectTestDb, seedTwoTenants } from './isolation-fixture';

type Fixture = Awaited<ReturnType<typeof seedTwoTenants>>;

describe('Cross-tenant isolation', () => {
  let testDb: Awaited<ReturnType<typeof connectTestDb>>;
  let tenancy: TenancyService;
  let assets: AssetsService;

  beforeAll(async () => {
    testDb = await connectTestDb();
    tenancy = new TenancyService(testDb.db);
    assets = new AssetsService(testDb.db);
  });

  afterAll(async () => { await testDb.disconnect(); });

  beforeEach(async () => {
    await testDb.clearTestCollections();
    fixture = await seedTwoTenants(testDb.db);
  });

  let fixture: Fixture;

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

  it('RAW reads are not blocked at the DB layer — MongoDB has no RLS backstop', async () => {
    const rawCompanyA = await testDb.db.company.findById(fixture.companyA.id).lean();
    expect(rawCompanyA).not.toBeNull();
  });

  it('Tenant-admin (crossCompany) on Tenant A still cannot see Tenant B', async () => {
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
