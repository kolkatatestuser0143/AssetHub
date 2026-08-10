import { TenancyService } from '../../src/modules/tenancy/tenancy.service';
import { AssetsService } from '../../src/modules/assets/assets.service';
import { connectTestDb, seedTwoTenants } from './isolation-fixture';

type Fixture = Awaited<ReturnType<typeof seedTwoTenants>>;

/**
 * This suite is the non-optional CI gate flagged throughout the
 * architecture doc (§3, §5) and the scaffold README. It doesn't test
 * feature correctness — it tests that a caller authenticated as
 * Tenant A can NEVER read or write Tenant B's data, even by directly
 * substituting Tenant B's IDs into an otherwise-valid request. If any
 * test here fails, that is a security incident, not a bug ticket —
 * fix before merging, never skip/xfail these.
 *
 * SECURITY MODEL CHANGE — read this before editing anything here:
 * The Postgres original had TWO layers: application-level filtering
 * (primary) + Postgres RLS (backstop). MongoDB has NO RLS, so the
 * application-level scope checks in the services are now the ONLY
 * isolation mechanism. That makes every test in this suite load-
 * bearing: a missing `scope()` in one query is a full cross-tenant
 * leak with nothing behind it to catch the mistake.
 *
 * The test "raw reads are NOT blocked at the DB layer" below
 * deliberately documents that absence — it asserts the raw query
 * SUCCEEDS. Do not delete it as "obviously passing"; it is the
 * written-down proof that these service-level tests are mandatory.
 *
 * Requires MONGODB_URI pointed at a DISPOSABLE test database.
 * Run: `pnpm exec jest test/security --runInBand`.
 */
describe('Cross-tenant isolation', () => {
  let testDb: Awaited<ReturnType<typeof connectTestDb>>;
  let tenancy: TenancyService;
  let assets: AssetsService;

  beforeAll(async () => {
    testDb = await connectTestDb();
    tenancy = new TenancyService(testDb.db);
    assets = new AssetsService(testDb.db);
  });

  afterAll(async () => {
    await testDb.disconnect();
  });

  beforeEach(async () => {
    await testDb.clearTestCollections();
    fixture = await seedTwoTenants(testDb.db);
  });

  let fixture: Fixture;

  it('User B cannot list Company A via a scoped query (application-level filter)', async () => {
    const companies = await tenancy.listCompanies(fixture.authB);
    expect(companies.find((c) => c.id === fixture.companyA.id)).toBeUndefined();
  });

  it('User B cannot create a BusinessUnit under Company A by ID substitution', async () => {
    await expect(
      tenancy.createBusinessUnit(fixture.authB, fixture.companyA.id, 'Malicious BU'),
    ).rejects.toThrow(/out of scope/i);
  });

  it("User B cannot create an asset against Company A's asset type", async () => {
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

  it('RAW reads are not blocked at the DB layer — documents that MongoDB has no RLS backstop', async () => {
    // This is NOT a passing security property. It is the explicit,
    // test-encoded acknowledgment that the app-level scope checks
    // above are the ONLY isolation. Postgres RLS used to sit behind
    // these checks; MongoDB has no equivalent, so a future developer
    // adding a query without scope() has NOTHING catching them except
    // this suite. If this assertion ever confuses you, re-read the
    // header comment on this describe block.
    const rawCompanyA = await testDb.db.company
      .findById(fixture.companyA.id)
      .lean();
    expect(rawCompanyA).not.toBeNull();
  });

  it('Tenant-admin (crossCompany) on Tenant A still cannot see Tenant B', async () => {
    const tenantAdminAuth = { ...fixture.authA, crossCompany: true };
    const companies = await tenancy.listCompanies(tenantAdminAuth);
    expect(companies.every((c) => c.id !== fixture.companyB.id)).toBe(true);
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
