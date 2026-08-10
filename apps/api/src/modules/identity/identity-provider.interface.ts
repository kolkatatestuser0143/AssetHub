// Architecture doc §8. Real implementations (SamlProvider, OidcProvider)
// are NOT included in this scaffold — signature/assertion validation,
// replay protection, and audience/issuer checks are exactly the kind of
// security-critical code that must be built and reviewed deliberately,
// not scaffolded speculatively. This interface is the contract to build
// against; use a maintained library (e.g. @node-saml/node-saml,
// openid-client) rather than hand-rolling crypto validation.

export interface NormalizedIdentity {
  externalId: string;
  email: string;
  firstName?: string;
  lastName?: string;
  rawAttributes: Record<string, unknown>;
}

export interface IdentityProvider {
  getAuthorizationUrl(): Promise<string>;
  handleCallback(params: Record<string, unknown>): Promise<NormalizedIdentity>;
  validate(): Promise<{ ok: boolean; errors: string[] }>;
}

// TODO(Phase 12): SamlProvider implements IdentityProvider using
// @node-saml/node-saml — signature validation, audience/issuer checks,
// replay protection via assertion-ID cache (Redis).
// TODO(Phase 12): OidcProvider implements IdentityProvider using
// openid-client — state+nonce+PKCE always, per architecture doc §8.
// Both feed into the SAME auth user-provisioning path SCIM uses
// (see modules/auth) — do not create a second user-creation path here.
