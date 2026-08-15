// Shared TS enums replacing @prisma/client generated enums.
export enum IdpProtocol { SAML = 'SAML', OIDC = 'OIDC' }
export enum MfaMethod { NONE = 'NONE', TOTP = 'TOTP', WEBAUTHN = 'WEBAUTHN' }
export enum AssetLifecycleState { REQUESTED = 'REQUESTED', IN_STOCK = 'IN_STOCK', ASSIGNED = 'ASSIGNED', IN_REPAIR = 'IN_REPAIR', LOST_STOLEN = 'LOST_STOLEN', RETIRED = 'RETIRED', DISPOSED = 'DISPOSED' }
export enum AssetCondition { NEW = 'NEW', GOOD = 'GOOD', FAIR = 'FAIR', DAMAGED = 'DAMAGED', NEEDS_INSPECTION = 'NEEDS_INSPECTION' }
export enum ScimDeprovisionPolicy { DISABLE_LOGIN = 'DISABLE_LOGIN', SOFT_DELETE = 'SOFT_DELETE', NO_ACTION = 'NO_ACTION' }
export enum IntegrationKind { IDENTITY_PROVIDER = 'IDENTITY_PROVIDER', DIRECTORY_SYNC = 'DIRECTORY_SYNC', ENDPOINT_MGMT = 'ENDPOINT_MGMT', OTHER = 'OTHER' }
