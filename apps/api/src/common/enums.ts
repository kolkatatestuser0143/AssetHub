// Shared TS enums replacing @prisma/client generated enums.
// Values MUST match what the web client and DTO validation expect
// (identity.controller.ts validates against the same string literals).

export enum IdpProtocol {
  SAML = 'SAML',
  OIDC = 'OIDC',
}

export enum MfaMethod {
  NONE = 'NONE',
  TOTP = 'TOTP',
  WEBAUTHN = 'WEBAUTHN',
}

export enum AssetLifecycleState {
  REQUESTED = 'REQUESTED',
  IN_STOCK = 'IN_STOCK',
  ASSIGNED = 'ASSIGNED',
  IN_REPAIR = 'IN_REPAIR',
  LOST_STOLEN = 'LOST_STOLEN',
  RETIRED = 'RETIRED',
  DISPOSED = 'DISPOSED',
}

export enum ScimDeprovisionPolicy {
  DISABLE_LOGIN = 'DISABLE_LOGIN',
  SOFT_DELETE = 'SOFT_DELETE',
  NO_ACTION = 'NO_ACTION',
}

export enum IntegrationKind {
  IDENTITY_PROVIDER = 'IDENTITY_PROVIDER',
  DIRECTORY_SYNC = 'DIRECTORY_SYNC',
  ENDPOINT_MGMT = 'ENDPOINT_MGMT',
  OTHER = 'OTHER',
}
