import { Injectable, NotFoundException } from '@nestjs/common';
import { MongooseDatabaseService } from '../../common/mongoose-database.service';
import { AuthContext } from '../../common/guards/tenant-context.guard';

const THEME_PRESETS = ['trial', 'starter', 'professional', 'enterprise', 'restricted'] as const;
type ThemePreset = typeof THEME_PRESETS[number];

function resolveThemePreset(planName: string, status: string): ThemePreset {
  if (['expired', 'revoked'].includes(status)) return 'restricted';
  const normalized = planName.trim().toLowerCase();
  if (normalized.includes('enterprise')) return 'enterprise';
  if (normalized.includes('professional') || normalized.includes('pro')) return 'professional';
  if (normalized.includes('trial')) return 'trial';
  return 'starter';
}

@Injectable()
export class TenantLicenseService {
  constructor(private readonly db: MongooseDatabaseService) {}

  async get(auth: AuthContext) {
    const subscription = await this.db.subscription
      .findOne({ tenantId: auth.tenantId })
      .sort({ createdAt: -1 })
      .lean();

    if (!subscription) {
      return {
        licensed: false,
        status: 'unassigned',
        message: 'No subscription or license has been assigned to this tenant.',
        plan: null,
        themePreset: 'restricted' as ThemePreset,
        limits: {},
        features: {},
        usage: await this.usage(auth),
      };
    }

    const plan = await this.db.plan.findById(subscription.planId).lean();
    if (!plan) throw new NotFoundException('Subscription plan not found');

    const entitlements = await this.db.entitlement
      .find({ subscriptionId: String(subscription._id) })
      .lean();

    const values: Record<string, unknown> = {};
    for (const entitlement of entitlements) values[entitlement.key] = entitlement.value;

    const now = new Date();
    const ended = !!subscription.endsAt && new Date(subscription.endsAt) < now;
    const status = ended ? 'expired' : String(subscription.status || 'active');

    return {
      licensed: ['active', 'trialing'].includes(status),
      status,
      subscriptionId: String(subscription._id),
      startedAt: subscription.startedAt,
      endsAt: subscription.endsAt ?? null,
      plan: {
        id: String(plan._id),
        name: plan.name,
      },
      themePreset: resolveThemePreset(plan.name, status),
      limits: this.pickLimits(plan.features ?? {}, values),
      features: this.pickFeatures(plan.features ?? {}, values),
      entitlements: values,
      usage: await this.usage(auth),
    };
  }

  private async usage(auth: AuthContext) {
    const scope = { tenantId: auth.tenantId };
    const [assets, users, companies] = await Promise.all([
      this.db.asset.countDocuments(scope),
      this.db.user.countDocuments({ ...scope, accountType: 'TENANT' }),
      this.db.company.countDocuments(scope),
    ]);

    return { assets, users, companies };
  }

  private pickLimits(features: Record<string, unknown>, entitlements: Record<string, unknown>) {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries({ ...features, ...entitlements })) {
      if (key.startsWith('max_') || key.endsWith('_limit') || key === 'user_limit' || key === 'asset_limit') {
        result[key] = value;
      }
    }
    return result;
  }

  private pickFeatures(features: Record<string, unknown>, entitlements: Record<string, unknown>) {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries({ ...features, ...entitlements })) {
      if (!(key.startsWith('max_') || key.endsWith('_limit') || key === 'user_limit' || key === 'asset_limit')) {
        result[key] = value;
      }
    }
    return result;
  }
}
