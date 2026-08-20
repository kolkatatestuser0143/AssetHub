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

/** Customer-facing names. Keep feature flags technical; never render FEATURE_KEYS directly in UI. */
export const FEATURE_LABELS: Record<FeatureKey, string> = {
  [FEATURE_KEYS.customFields]: 'Custom fields',
  [FEATURE_KEYS.customRoles]: 'Roles & permissions',
  [FEATURE_KEYS.sso]: 'Sign-in & security',
  [FEATURE_KEYS.scim]: 'Directory sync',
  [FEATURE_KEYS.audit]: 'Activity history',
  [FEATURE_KEYS.advancedReports]: 'Advanced reports',
  [FEATURE_KEYS.scheduledReports]: 'Scheduled reports',
  [FEATURE_KEYS.assetDocuments]: 'Asset documents',
  [FEATURE_KEYS.bulkImport]: 'Bulk import',
  [FEATURE_KEYS.apiAccess]: 'API access',
  [FEATURE_KEYS.webhooks]: 'Integrations',
  [FEATURE_KEYS.approvalWorkflows]: 'Approval workflows',
};

export const FEATURE_ROUTES: Record<string, FeatureKey> = {
  '/custom-fields': FEATURE_KEYS.customFields,
  '/roles': FEATURE_KEYS.customRoles,
  '/identity': FEATURE_KEYS.sso,
  '/audit': FEATURE_KEYS.audit,
  '/reports': FEATURE_KEYS.advancedReports,
};

export function featureLabel(feature: FeatureKey): string {
  return FEATURE_LABELS[feature];
}
