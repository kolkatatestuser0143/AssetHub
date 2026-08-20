// Identity-provider contract. Provider-specific crypto/claim validation must use
// maintained libraries; all successful providers feed the same provisioning path.
export interface NormalizedIdentity {
  externalId: string;
  email: string;
  employeeId?: string;
  firstName?: string;
  lastName?: string;
  jobTitle?: string;
  department?: string;
  phone?: string;
  active?: boolean;
  rawAttributes: Record<string, unknown>;
}

export interface IdentityProvider {
  getAuthorizationUrl(): Promise<string>;
  handleCallback(params: Record<string, unknown>): Promise<NormalizedIdentity>;
  validate(): Promise<{ ok: boolean; errors: string[] }>;
}
