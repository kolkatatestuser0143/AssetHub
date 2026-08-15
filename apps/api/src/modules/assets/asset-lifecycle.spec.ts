import { BadRequestException } from '@nestjs/common';
import { AssetLifecycleState } from '../../common/enums';
import { allowedLifecycleTransitions, assertLifecycleTransition } from './asset-lifecycle';

describe('asset lifecycle transitions', () => {
  it('allows normal stock to assigned flow', () => {
    expect(allowedLifecycleTransitions(AssetLifecycleState.IN_STOCK)).toContain(AssetLifecycleState.ASSIGNED);
    expect(() => assertLifecycleTransition(AssetLifecycleState.IN_STOCK, AssetLifecycleState.ASSIGNED)).not.toThrow();
  });

  it('blocks disposed assets from changing state', () => {
    expect(() => assertLifecycleTransition(AssetLifecycleState.DISPOSED, AssetLifecycleState.ASSIGNED)).toThrow(BadRequestException);
  });

  it('blocks repair directly to assigned', () => {
    expect(() => assertLifecycleTransition(AssetLifecycleState.IN_REPAIR, AssetLifecycleState.ASSIGNED)).toThrow(BadRequestException);
  });

  it('requires a reason for risky terminal states', () => {
    expect(() => assertLifecycleTransition(AssetLifecycleState.IN_STOCK, AssetLifecycleState.RETIRED)).toThrow(BadRequestException);
    expect(() => assertLifecycleTransition(AssetLifecycleState.IN_STOCK, AssetLifecycleState.RETIRED, 'End of life')).not.toThrow();
    expect(() => assertLifecycleTransition(AssetLifecycleState.RETIRED, AssetLifecycleState.DISPOSED)).toThrow(BadRequestException);
    expect(() => assertLifecycleTransition(AssetLifecycleState.RETIRED, AssetLifecycleState.DISPOSED, 'Disposed via approved process')).not.toThrow();
  });

  it('blocks no-op transitions', () => {
    expect(() => assertLifecycleTransition(AssetLifecycleState.IN_STOCK, AssetLifecycleState.IN_STOCK)).toThrow(BadRequestException);
  });
});
