"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.IntegrationKind = exports.ScimDeprovisionPolicy = exports.AssetLifecycleState = exports.MfaMethod = exports.IdpProtocol = void 0;
var IdpProtocol;
(function (IdpProtocol) {
    IdpProtocol["SAML"] = "SAML";
    IdpProtocol["OIDC"] = "OIDC";
})(IdpProtocol || (exports.IdpProtocol = IdpProtocol = {}));
var MfaMethod;
(function (MfaMethod) {
    MfaMethod["NONE"] = "NONE";
    MfaMethod["TOTP"] = "TOTP";
    MfaMethod["WEBAUTHN"] = "WEBAUTHN";
})(MfaMethod || (exports.MfaMethod = MfaMethod = {}));
var AssetLifecycleState;
(function (AssetLifecycleState) {
    AssetLifecycleState["REQUESTED"] = "REQUESTED";
    AssetLifecycleState["IN_STOCK"] = "IN_STOCK";
    AssetLifecycleState["ASSIGNED"] = "ASSIGNED";
    AssetLifecycleState["IN_REPAIR"] = "IN_REPAIR";
    AssetLifecycleState["LOST_STOLEN"] = "LOST_STOLEN";
    AssetLifecycleState["RETIRED"] = "RETIRED";
    AssetLifecycleState["DISPOSED"] = "DISPOSED";
})(AssetLifecycleState || (exports.AssetLifecycleState = AssetLifecycleState = {}));
var ScimDeprovisionPolicy;
(function (ScimDeprovisionPolicy) {
    ScimDeprovisionPolicy["DISABLE_LOGIN"] = "DISABLE_LOGIN";
    ScimDeprovisionPolicy["SOFT_DELETE"] = "SOFT_DELETE";
    ScimDeprovisionPolicy["NO_ACTION"] = "NO_ACTION";
})(ScimDeprovisionPolicy || (exports.ScimDeprovisionPolicy = ScimDeprovisionPolicy = {}));
var IntegrationKind;
(function (IntegrationKind) {
    IntegrationKind["IDENTITY_PROVIDER"] = "IDENTITY_PROVIDER";
    IntegrationKind["DIRECTORY_SYNC"] = "DIRECTORY_SYNC";
    IntegrationKind["ENDPOINT_MGMT"] = "ENDPOINT_MGMT";
    IntegrationKind["OTHER"] = "OTHER";
})(IntegrationKind || (exports.IntegrationKind = IntegrationKind = {}));
//# sourceMappingURL=enums.js.map