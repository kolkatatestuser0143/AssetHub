import { HealthController } from './health.controller';

describe('HealthController', () => {
  it('reports live without checking dependencies', () => {
    const controller = new HealthController({ readyState: 0 } as any);
    expect(controller.live()).toEqual(expect.objectContaining({ status: 'ok' }));
  });

  it('returns HTTP 200 when dependencies are ready', async () => {
    const controller = new HealthController({ readyState: 1 } as any);
    jest.spyOn(controller as any, 'redisStatus').mockResolvedValue(true);
    const response = { status: jest.fn().mockReturnThis(), json: jest.fn().mockReturnThis() } as any;
    await controller.ready(response);
    expect(response.status).toHaveBeenCalledWith(200);
  });

  it('returns HTTP 503 when a dependency is unavailable', async () => {
    const controller = new HealthController({ readyState: 1 } as any);
    jest.spyOn(controller as any, 'redisStatus').mockResolvedValue(false);
    const response = { status: jest.fn().mockReturnThis(), json: jest.fn().mockReturnThis() } as any;
    await controller.ready(response);
    expect(response.status).toHaveBeenCalledWith(503);
    expect(response.json).toHaveBeenCalledWith(expect.objectContaining({ status: 'not_ready' }));
  });
});
