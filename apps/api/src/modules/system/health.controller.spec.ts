import { HealthController } from './health.controller';

describe('HealthController', () => {
  it('reports live without checking dependencies', async () => {
    const controller = new HealthController({ readyState: 0 } as any);
    expect(controller.live()).toEqual(expect.objectContaining({ status: 'ok' }));
  });

  it('reports readiness only when MongoDB and Redis are healthy', async () => {
    const controller = new HealthController({ readyState: 1 } as any);
    jest.spyOn(controller as any, 'redisStatus').mockResolvedValue(true);
    await expect(controller.ready()).resolves.toEqual(expect.objectContaining({ status: 'ready' }));
    jest.spyOn(controller as any, 'redisStatus').mockResolvedValue(false);
    await expect(controller.ready()).resolves.toEqual(expect.objectContaining({ status: 'not_ready', statusCode: 503 }));
  });
});
