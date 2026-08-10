import { IdentitySecurityCacheService } from '../../src/modules/identity/identity-security-cache.service';
import { SamlProvider } from '../../src/modules/identity/providers/saml.provider';
import { OidcProvider } from '../../src/modules/identity/providers/oidc.provider';

/**
 * The identity module is the highest-risk code in this platform (see
 * README). Every test here corresponds to a specific attack this
 * module must resist. If any of these fail, that's a stop-and-fix
 * situation, same standard as test/security/tenant-isolation.spec.ts.
 *
 * Requires REDIS_URL pointed at a real (disposable-for-testing) Redis
 * instance — the cache is intentionally not mocked, since the cache's
 * atomicity guarantees (NX, single-use GET+DEL) are exactly what's
 * under test in the replay-protection cases.
 */
describe('IdentitySecurityCacheService — replay/state primitives', () => {
  let cache: IdentitySecurityCacheService;

  beforeAll(() => {
    cache = new IdentitySecurityCacheService();
  });

  afterAll(async () => {
    await cache.onModuleDestroy();
  });

  it('setOnce succeeds the first time and fails on replay of the same key', async () => {
    const key = `test:replay:${Date.now()}`;
    const first = await cache.setOnce(key, 60);
    const second = await cache.setOnce(key, 60);
    expect(first).toBe(true);
    expect(second).toBe(false); // this IS the replay-detection guarantee
  });

  it('takeValue is single-use — a second read returns null', async () => {
    const key = `test:state:${Date.now()}`;
    await cache.storeValue(key, 'nonce-and-verifier', 60);
    const first = await cache.takeValue(key);
    const second = await cache.takeValue(key);
    expect(first).toBe('nonce-and-verifier');
    expect(second).toBeNull(); // proves OIDC state/nonce can't be reused
  });

  it('takeValue returns null for a key that was never set (forged/expired state)', async () => {
    const result = await cache.takeValue(`test:never-set:${Date.now()}`);
    expect(result).toBeNull();
  });
});

describe('OidcProvider — callback rejects an unrecognized state', () => {
  it('throws when the state was never stored (forged or expired)', async () => {
    const cache = new IdentitySecurityCacheService();
    const provider = new OidcProvider(
      {
        issuerUrl: 'https://example-idp.invalid', // never actually contacted in this test
        clientId: 'test-client',
        clientSecret: 'test-secret',
        redirectUri: 'https://app.invalid/callback',
        attributeMapping: {},
      },
      'test-company-id',
      cache,
    );

    // No matching cache entry for this state was ever written — this
    // must fail BEFORE attempting token exchange, since a forged state
    // means there's no legitimate nonce/verifier to validate against.
    await expect(
      provider.handleCallback({ code: 'irrelevant', state: 'never-issued-state' }),
    ).rejects.toThrow(/invalid or expired oidc state/i);

    await cache.onModuleDestroy();
  });
});

describe('SamlProvider — validate() refuses to run without a cert', () => {
  it('reports invalid config rather than silently accepting an unsigned IdP', async () => {
    const cache = new IdentitySecurityCacheService();
    const provider = new SamlProvider(
      {
        entryPoint: 'https://example-idp.invalid/sso',
        issuer: 'urn:test:sp',
        cert: '', // deliberately missing — this is the case that must be caught
        callbackUrl: 'https://app.invalid/callback/saml',
        attributeMapping: {},
      },
      'test-company-id',
      cache,
    );

    const result = await provider.validate();
    expect(result.ok).toBe(false);
    expect(result.errors.some((e) => /certificate/i.test(e))).toBe(true);

    await cache.onModuleDestroy();
  });

  it('replay protection: the same assertion identifier is rejected on second use', async () => {
    // This exercises the cache-based replay check directly (the same
    // mechanism handleCallback() calls internally) without needing a
    // real signed SAML response, which would require a live IdP or a
    // hand-built signed fixture — tracked as a follow-up for full
    // end-to-end coverage. This test proves the replay PRIMITIVE works;
    // it does not yet prove handleCallback() wires it correctly for a
    // real assertion — see README gap notes.
    const cache = new IdentitySecurityCacheService();
    const companyId = 'test-company-id';
    const assertionId = `_assertion-${Date.now()}`;

    const first = await cache.setOnce(`saml-assertion:${companyId}:${assertionId}`, 300);
    const second = await cache.setOnce(`saml-assertion:${companyId}:${assertionId}`, 300);

    expect(first).toBe(true);
    expect(second).toBe(false);

    await cache.onModuleDestroy();
  });
});
