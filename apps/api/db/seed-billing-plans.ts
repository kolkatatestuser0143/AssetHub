import '../src/bootstrap-dns';
import 'dotenv/config';
import { config as loadEnv } from 'dotenv';
loadEnv({ path: require('path').resolve(__dirname, '../../../.env') });
import mongoose from 'mongoose';

const UNLIMITED = null;
const PLANS = [
  {
    name: 'Free / Trial', themePreset: 'trial', features: {
      max_assets: 100, max_users: 5, max_companies: 1, max_business_units: 2, max_plants: 5, max_locations: 5,
      max_departments: 10, max_vendors: 25, max_asset_documents: 250, max_saved_reports: 3, max_api_keys: 1,
      max_integrations: 1, max_storage_gb: 1, max_asset_document_size_mb: 10, max_api_rate_limit_per_minute: 60,
      session_max_days: 7, max_concurrent_sessions: 2, audit_retention_days: 30,
      sso_enabled: false, scim_enabled: false, mfa_enabled: false, audit_enabled: true,
      advanced_reports_enabled: false, scheduled_reports_enabled: false, asset_documents_enabled: true,
      bulk_import_enabled: false, api_access_enabled: false, webhooks_enabled: false, custom_roles_enabled: false,
      custom_fields_enabled: false, approval_workflows_enabled: false,
    },
  },
  {
    name: 'Starter', themePreset: 'starter', features: {
      max_assets: 1000, max_users: 25, max_companies: 3, max_business_units: 10, max_plants: 25, max_locations: 25,
      max_departments: 100, max_vendors: 100, max_asset_documents: 2500, max_saved_reports: 15, max_api_keys: 3,
      max_integrations: 3, max_storage_gb: 10, max_asset_document_size_mb: 25, max_api_rate_limit_per_minute: 120,
      session_max_days: 14, max_concurrent_sessions: 5, audit_retention_days: 90,
      sso_enabled: false, scim_enabled: false, mfa_enabled: true, audit_enabled: true,
      advanced_reports_enabled: false, scheduled_reports_enabled: false, asset_documents_enabled: true,
      bulk_import_enabled: true, api_access_enabled: true, webhooks_enabled: false, custom_roles_enabled: false,
      custom_fields_enabled: true, approval_workflows_enabled: false,
    },
  },
  {
    name: 'Professional', themePreset: 'professional', features: {
      max_assets: 5000, max_users: 100, max_companies: 10, max_business_units: 50, max_plants: 100, max_locations: 100,
      max_departments: 500, max_vendors: 500, max_asset_documents: 10000, max_saved_reports: 50, max_api_keys: 10,
      max_integrations: 10, max_storage_gb: 50, max_asset_document_size_mb: 50, max_api_rate_limit_per_minute: 300,
      session_max_days: 30, max_concurrent_sessions: 10, audit_retention_days: 365,
      sso_enabled: true, scim_enabled: false, mfa_enabled: true, audit_enabled: true,
      advanced_reports_enabled: true, scheduled_reports_enabled: true, asset_documents_enabled: true,
      bulk_import_enabled: true, api_access_enabled: true, webhooks_enabled: true, custom_roles_enabled: true,
      custom_fields_enabled: true, approval_workflows_enabled: true,
    },
  },
  {
    name: 'Business', themePreset: 'professional', features: {
      max_assets: 25000, max_users: 500, max_companies: 50, max_business_units: 250, max_plants: 500, max_locations: 500,
      max_departments: 2500, max_vendors: 2000, max_asset_documents: 50000, max_saved_reports: 200, max_api_keys: 25,
      max_integrations: 25, max_storage_gb: 250, max_asset_document_size_mb: 100, max_api_rate_limit_per_minute: 1000,
      session_max_days: 60, max_concurrent_sessions: 20, audit_retention_days: 730,
      sso_enabled: true, scim_enabled: true, mfa_enabled: true, audit_enabled: true,
      advanced_reports_enabled: true, scheduled_reports_enabled: true, asset_documents_enabled: true,
      bulk_import_enabled: true, api_access_enabled: true, webhooks_enabled: true, custom_roles_enabled: true,
      custom_fields_enabled: true, approval_workflows_enabled: true,
    },
  },
  {
    name: 'Enterprise', themePreset: 'enterprise', features: {
      max_assets: UNLIMITED, max_users: UNLIMITED, max_companies: UNLIMITED, max_business_units: UNLIMITED,
      max_plants: UNLIMITED, max_locations: UNLIMITED, max_departments: UNLIMITED, max_vendors: UNLIMITED,
      max_asset_documents: UNLIMITED, max_saved_reports: UNLIMITED, max_api_keys: UNLIMITED, max_integrations: UNLIMITED,
      max_storage_gb: UNLIMITED, max_asset_document_size_mb: 250, max_api_rate_limit_per_minute: 5000,
      session_max_days: 90, max_concurrent_sessions: UNLIMITED, audit_retention_days: UNLIMITED,
      sso_enabled: true, scim_enabled: true, mfa_enabled: true, audit_enabled: true,
      advanced_reports_enabled: true, scheduled_reports_enabled: true, asset_documents_enabled: true,
      bulk_import_enabled: true, api_access_enabled: true, webhooks_enabled: true, custom_roles_enabled: true,
      custom_fields_enabled: true, approval_workflows_enabled: true,
    },
  },
];

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('Missing MONGODB_URI');
  const connection = await mongoose.createConnection(uri).asPromise();
  try {
    const db = connection.db;
    if (!db) throw new Error('Mongo connection failed');
    const plans = db.collection('plans');
    const now = new Date();
    for (const plan of PLANS) {
      await plans.updateOne(
        { name: plan.name },
        { $set: { name: plan.name, themePreset: plan.themePreset, features: plan.features, updatedAt: now }, $setOnInsert: { _id: new mongoose.Types.ObjectId(), createdAt: now } },
        { upsert: true },
      );
    }
    console.log(`Seeded ${PLANS.length} AssetHub plans.`);
  } finally {
    await connection.close();
  }
}

main().catch((error) => { console.error(error); process.exit(1); });
