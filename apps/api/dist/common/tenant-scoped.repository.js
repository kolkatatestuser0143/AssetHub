"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TenantScopedRepository = void 0;
class TenantScopedRepository {
    scope(auth) {
        if (auth.crossCompany) {
            return { tenantId: auth.tenantId };
        }
        return { tenantId: auth.tenantId, companyId: auth.companyId };
    }
}
exports.TenantScopedRepository = TenantScopedRepository;
//# sourceMappingURL=tenant-scoped.repository.js.map