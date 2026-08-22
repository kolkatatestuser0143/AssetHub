import { BadRequestException } from '@nestjs/common';
import { AssetLifecycleState } from '../../common/enums';
import {
  allowedLifecycleTransitions,
  assertDirectLifecycleTransition,
  assertLifecycleTransition,
  lifecycleTransitionMeta,
} from './asset-lifecycle';

describe('asset lifecycle', () => {
  it('allows only declared transitions', () => {
    expect(allowedLifecycleTransitions(AssetLifecycleState.IN_STOCK)).toEqual([
      AssetLifecycleState.ASSIGNED,
      AssetLifecycleState.IN_REPAIR,
      AssetLifecycleState.LOST_STOLEN,
      AssetLifecycleState.RETIRED,
    ]);
    expect(() => assertLifecycleTransition(AssetLifecycleState.DISPOSED, AssetLifecycleState.IN_STOCK)).toThrow(BadRequestException);
  });

  it('requires a reason for security-sensitive terminal/problem states', () => {
    expect(() => assertLifecycleTransition(AssetLifecycleState.IN_STOCK, AssetLifecycleState.LOST_STOLEN)).toThrow('A reason is required');
    expect(() => assertLifecycleTransition(AssetLifecycleState.IN_STOCK, AssetLifecycleState.LOST_STOLEN, 'Reported missing')).not.toThrow();
    expect(() => assertLifecycleTransition(AssetLifecycleState.RETIRED, AssetLifecycleState.DISPOSED)).toThrow('A reason is required');
  });

  it('forces assignment and return through central workflows', () => {
    expect(() => assertDirectLifecycleTransition(AssetLifecycleState.IN_STOCK, AssetLifecycleState.ASSIGNED)).toThrow('Assign or Transfer workflow');
    expect(() => assertDirectLifecycleTransition(AssetLifecycleState.ASSIGNED, AssetLifecycleState.IN_STOCK)).toThrow('Return or Transfer workflow');
  });

  it('describes which transitions are centrally managed', () => {
    expect(lifecycleTransitionMeta(AssetLifecycleState.ASSIGNED)).toEqual([
      { toState: AssetLifecycleState.IN_STOCK, requiresReason: false, managedBy: 'return-or-transfer' },
      { toState: AssetLifecycleState.IN_REPAIR, requiresReason: false, managedBy: 'lifecycle' },
      { toState: AssetLifecycleState.LOST_STOLEN, requiresReason: true, managedBy: 'lifecycle' },
      { toState: AssetLifecycleState.RETIRED, requiresReason: true, managedBy: 'lifecycle' },
    ]);
  });
});
