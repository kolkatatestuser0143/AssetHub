export const FEATURE_KEYS = {
  customFields: 'custom_fields_enabled',
  customRoles: 'custom_roles_enabled',
  sso: 'sso_enabled',
  scim: 'scim_enabled',
  audit: 'audit_enabled',
  advancedReports: 'advanced_reports_enabled',
  scheduledReports: 'scheduled_reports_enabled',
  assetDocuments: 'asset_documents_enabled',
  bulkImport: 'bulk_import_enabled',
  apiAccess: 'api_access_enabled',
  webhooks: 'webhooks_enabled',
  approvalWorkflows: 'approval_workflows_enabled',
} as const;

export type FeatureKey = typeof FEATURE_KEYS[keyof typeof FEATURE_KEYS];

export const FEATURE_ROUTES: Record<string, FeatureKey> = {
  '/custom-fields': FEATURE_KEYS.customFields,
  '/roles': FEATURE_KEYS.customRoles,
  '/identity': FEATURE_KEYS.sso,
  '/audit': FEATURE_KEYS.audit,
  '/reports': FEATURE_KEYS.advancedReports,
};
