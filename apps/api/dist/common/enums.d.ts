export declare enum IdpProtocol {
    SAML = "SAML",
    OIDC = "OIDC"
}
export declare enum MfaMethod {
    NONE = "NONE",
    TOTP = "TOTP",
    WEBAUTHN = "WEBAUTHN"
}
export declare enum AssetLifecycleState {
    REQUESTED = "REQUESTED",
    IN_STOCK = "IN_STOCK",
    ASSIGNED = "ASSIGNED",
    IN_REPAIR = "IN_REPAIR",
    LOST_STOLEN = "LOST_STOLEN",
    RETIRED = "RETIRED",
    DISPOSED = "DISPOSED"
}
export declare enum ScimDeprovisionPolicy {
    DISABLE_LOGIN = "DISABLE_LOGIN",
    SOFT_DELETE = "SOFT_DELETE",
    NO_ACTION = "NO_ACTION"
}
export declare enum IntegrationKind {
    IDENTITY_PROVIDER = "IDENTITY_PROVIDER",
    DIRECTORY_SYNC = "DIRECTORY_SYNC",
    ENDPOINT_MGMT = "ENDPOINT_MGMT",
    OTHER = "OTHER"
}
