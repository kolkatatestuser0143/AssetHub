import { ProductionExceptionFilter } from './production-exception.filter';

describe('ProductionExceptionFilter', () => {
  it('does not expose an unknown exception stack', () => {
    const filter = new ProductionExceptionFilter();
    const json = jest.fn();
    const response = { status: jest.fn().mockReturnThis(), json };
    const request = { method: 'GET', url: '/api/v1/test', requestId: 'req-1', headers: {} };
    filter.catch(new Error('secret database details'), { switchToHttp: () => ({ getResponse: () => response, getRequest: () => request }) } as any);
    expect(json).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 500, requestId: 'req-1', message: 'Internal server error' }));
    expect(JSON.stringify(json.mock.calls[0][0])).not.toContain('secret database details');
  });
});
