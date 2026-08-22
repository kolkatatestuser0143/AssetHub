import { BadRequestException } from '@nestjs/common';
import { AssetLifecycleState } from '../../common/enums';

const TRANSITIONS: Record<AssetLifecycleState, readonly AssetLifecycleState[]> = {
  [AssetLifecycleState.REQUESTED]: [AssetLifecycleState.IN_STOCK, AssetLifecycleState.RETIRED],
  [AssetLifecycleState.IN_STOCK]: [AssetLifecycleState.ASSIGNED, AssetLifecycleState.IN_REPAIR, AssetLifecycleState.LOST_STOLEN, AssetLifecycleState.RETIRED],
  [AssetLifecycleState.ASSIGNED]: [AssetLifecycleState.IN_STOCK, AssetLifecycleState.IN_REPAIR, AssetLifecycleState.LOST_STOLEN, AssetLifecycleState.RETIRED],
  [AssetLifecycleState.IN_REPAIR]: [AssetLifecycleState.IN_STOCK, AssetLifecycleState.RETIRED],
  [AssetLifecycleState.LOST_STOLEN]: [AssetLifecycleState.IN_STOCK, AssetLifecycleState.RETIRED],
  [AssetLifecycleState.RETIRED]: [AssetLifecycleState.DISPOSED],
  [AssetLifecycleState.DISPOSED]: [],
};

const REASON_REQUIRED = new Set<AssetLifecycleState>([AssetLifecycleState.LOST_STOLEN, AssetLifecycleState.RETIRED, AssetLifecycleState.DISPOSED, AssetLifecycleState.IN_STOCK]);
const DIRECT_IN_STOCK_BLOCKED_FROM = new Set<AssetLifecycleState>([AssetLifecycleState.IN_STOCK, AssetLifecycleState.ASSIGNED]);

export function assertLifecycleTransition(from: AssetLifecycleState, to: AssetLifecycleState, reason?: string) {
  if (from === to) throw new BadRequestException(`Asset is already in ${from}`);
  if (!TRANSITIONS[from]?.includes(to)) throw new BadRequestException(`Invalid asset lifecycle transition: ${from} → ${to}`);
  if (REASON_REQUIRED.has(to) && !reason?.trim()) throw new BadRequestException(`A reason is required when moving an asset to ${to}`);
}

export function assertDirectLifecycleTransition(from: AssetLifecycleState, to: AssetLifecycleState, reason?: string) {
  assertLifecycleTransition(from, to, reason);
  if (to === AssetLifecycleState.ASSIGNED) throw new BadRequestException('Use the Assign or Transfer workflow to put an asset into Assigned state');
  if (to === AssetLifecycleState.IN_STOCK && DIRECT_IN_STOCK_BLOCKED_FROM.has(from)) throw new BadRequestException('Use the Return or Transfer workflow to put an asset into In Stock state');
}

export function allowedLifecycleTransitions(from: AssetLifecycleState) { return [...(TRANSITIONS[from] ?? [])]; }
export function lifecycleTransitionMeta(from: AssetLifecycleState) { return allowedLifecycleTransitions(from).map((toState) => ({ toState, requiresReason: REASON_REQUIRED.has(toState), managedBy: toState === AssetLifecycleState.ASSIGNED ? 'assignment' : toState === AssetLifecycleState.IN_STOCK && DIRECT_IN_STOCK_BLOCKED_FROM.has(from) ? 'return-or-transfer' : toState === AssetLifecycleState.IN_STOCK ? 'repair-or-recovery' : 'lifecycle' })); }
