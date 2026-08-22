import { BadRequestException } from '@nestjs/common';
import { AssetLifecycleState } from '../../common/enums';

const TRANSITIONS: Record<AssetLifecycleState, readonly AssetLifecycleState[]> = {
  [AssetLifecycleState.REQUESTED]: [AssetLifecycleState.IN_STOCK, AssetLifecycleState.RETIRED],
  [AssetLifecycleState.IN_STOCK]: [
    AssetLifecycleState.ASSIGNED,
    AssetLifecycleState.IN_REPAIR,
    AssetLifecycleState.LOST_STOLEN,
    AssetLifecycleState.RETIRED,
  ],
  [AssetLifecycleState.ASSIGNED]: [
    AssetLifecycleState.IN_STOCK,
    AssetLifecycleState.IN_REPAIR,
    AssetLifecycleState.LOST_STOLEN,
    AssetLifecycleState.RETIRED,
  ],
  [AssetLifecycleState.IN_REPAIR]: [AssetLifecycleState.IN_STOCK, AssetLifecycleState.RETIRED],
  [AssetLifecycleState.LOST_STOLEN]: [AssetLifecycleState.IN_STOCK, AssetLifecycleState.RETIRED],
  [AssetLifecycleState.RETIRED]: [AssetLifecycleState.DISPOSED],
  [AssetLifecycleState.DISPOSED]: [],
};

const REASON_REQUIRED = new Set<AssetLifecycleState>([
  AssetLifecycleState.LOST_STOLEN,
  AssetLifecycleState.RETIRED,
  AssetLifecycleState.DISPOSED,
]);

const CENTRAL_OPERATIONS_REQUIRED = new Set<AssetLifecycleState>([
  AssetLifecycleState.ASSIGNED,
  AssetLifecycleState.IN_STOCK,
]);

export function assertLifecycleTransition(
  from: AssetLifecycleState,
  to: AssetLifecycleState,
  reason?: string,
) {
  if (from === to) throw new BadRequestException(`Asset is already in ${from}`);
  if (!TRANSITIONS[from]?.includes(to)) {
    throw new BadRequestException(`Invalid asset lifecycle transition: ${from} → ${to}`);
  }
  if (REASON_REQUIRED.has(to) && !reason?.trim()) {
    throw new BadRequestException(`A reason is required when moving an asset to ${to}`);
  }
}

export function assertDirectLifecycleTransition(
  from: AssetLifecycleState,
  to: AssetLifecycleState,
  reason?: string,
) {
  assertLifecycleTransition(from, to, reason);
  if (CENTRAL_OPERATIONS_REQUIRED.has(to)) {
    throw new BadRequestException(
      to === AssetLifecycleState.ASSIGNED
        ? 'Use the Assign or Transfer workflow to put an asset into Assigned state'
        : 'Use the Return or Transfer workflow to put an asset into In Stock state',
    );
  }
}

export function allowedLifecycleTransitions(from: AssetLifecycleState) {
  return [...(TRANSITIONS[from] ?? [])];
}

export function lifecycleTransitionMeta(from: AssetLifecycleState) {
  return allowedLifecycleTransitions(from).map((toState) => ({
    toState,
    requiresReason: REASON_REQUIRED.has(toState),
    managedBy:
      toState === AssetLifecycleState.ASSIGNED
        ? 'assignment'
        : toState === AssetLifecycleState.IN_STOCK
          ? 'return-or-transfer'
          : 'lifecycle',
  }));
}
