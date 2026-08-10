"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SamlProvider = void 0;
const node_saml_1 = require("@node-saml/node-saml");
class SamlProvider {
    constructor(config, companyId, cache) {
        this.config = config;
        this.companyId = companyId;
        this.cache = cache;
        this.saml = new node_saml_1.SAML({
            entryPoint: config.entryPoint,
            issuer: config.issuer,
            cert: config.cert,
            callbackUrl: config.callbackUrl,
            wantAssertionsSigned: true,
            wantAuthnResponseSigned: true,
        });
    }
    async getAuthorizationUrl() {
        return this.saml.getAuthorizeUrlAsync('', '', {});
    }
    async handleCallback(params) {
        const { profile } = await this.saml.validatePostResponseAsync({ SAMLResponse: params.SAMLResponse });
        if (!profile) {
            throw new Error('SAML response produced no profile — rejected');
        }
        const assertionId = profile.inResponseTo ?? profile.sessionIndex ?? profile.nameID;
        const firstUse = await this.cache.setOnce(`saml-assertion:${this.companyId}:${assertionId}`, 300);
        if (!firstUse) {
            throw new Error('SAML assertion replay detected — rejected');
        }
        const rawAttributes = (profile.attributes ?? {});
        const mapped = this.applyAttributeMapping(rawAttributes);
        return {
            externalId: profile.nameID,
            email: mapped.email ?? profile.nameID,
            firstName: mapped.firstName,
            lastName: mapped.lastName,
            rawAttributes,
        };
    }
    async validate() {
        const errors = [];
        if (!this.config.cert)
            errors.push('IdP signing certificate is required');
        if (!this.config.entryPoint)
            errors.push('entryPoint (IdP SSO URL) is required');
        return { ok: errors.length === 0, errors };
    }
    applyAttributeMapping(attrs) {
        const result = {};
        for (const [providerAttr, internalField] of Object.entries(this.config.attributeMapping)) {
            if (attrs[providerAttr] != null)
                result[internalField] = String(attrs[providerAttr]);
        }
        return result;
    }
}
exports.SamlProvider = SamlProvider;
//# sourceMappingURL=saml.provider.js.map