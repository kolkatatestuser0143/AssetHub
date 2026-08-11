"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.OidcProvider = void 0;
const openid_client_1 = require("openid-client");
class OidcProvider {
    constructor(config, companyId, cache) {
        this.config = config;
        this.companyId = companyId;
        this.cache = cache;
        this.client = null;
    }
    async getClient() {
        if (this.client)
            return this.client;
        const issuer = await openid_client_1.Issuer.discover(this.config.issuerUrl);
        this.client = new issuer.Client({
            client_id: this.config.clientId,
            client_secret: this.config.clientSecret,
            redirect_uris: [this.config.redirectUri],
            response_types: ['code'],
        });
        return this.client;
    }
    async getAuthorizationUrl() {
        const client = await this.getClient();
        const state = openid_client_1.generators.state();
        const nonce = openid_client_1.generators.nonce();
        const codeVerifier = openid_client_1.generators.codeVerifier();
        const codeChallenge = openid_client_1.generators.codeChallenge(codeVerifier);
        await this.cache.storeValue(`oidc:${this.companyId}:${state}`, JSON.stringify({ nonce, codeVerifier }), 600);
        return client.authorizationUrl({
            scope: 'openid email profile', state, nonce,
            code_challenge: codeChallenge, code_challenge_method: 'S256',
        });
    }
    async handleCallback(params) {
        const cached = await this.cache.takeValue(`oidc:${this.companyId}:${params.state}`);
        if (!cached) {
            throw new Error('Invalid or expired OIDC state — possible CSRF or replay attempt');
        }
        const { nonce, codeVerifier } = JSON.parse(cached);
        const client = await this.getClient();
        const tokenSet = await client.callback(this.config.redirectUri, params, {
            state: params.state,
            nonce,
            code_verifier: codeVerifier,
        });
        const claims = tokenSet.claims();
        const mapped = this.applyAttributeMapping(claims);
        return {
            externalId: claims.sub,
            email: mapped.email ?? claims.email,
            firstName: mapped.firstName,
            lastName: mapped.lastName,
            rawAttributes: claims,
        };
    }
    async validate() {
        try {
            await openid_client_1.Issuer.discover(this.config.issuerUrl);
            return { ok: true, errors: [] };
        }
        catch (err) {
            return { ok: false, errors: [err.message] };
        }
    }
    applyAttributeMapping(claims) {
        const result = {};
        for (const [providerAttr, internalField] of Object.entries(this.config.attributeMapping)) {
            if (claims[providerAttr] != null)
                result[internalField] = String(claims[providerAttr]);
        }
        return result;
    }
}
exports.OidcProvider = OidcProvider;
//# sourceMappingURL=oidc.provider.js.map