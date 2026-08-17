import { ForbiddenException } from '@nestjs/common';
import { csrfMiddleware } from './csrf.middleware';

describe('csrfMiddleware', () => {
  function response() {
    const headers = new Map<string, unknown>();
    return {
      getHeader: (name: string) => headers.get(name),
      setHeader: (name: string, value: unknown) => headers.set(name, value),
      headers,
    };
  }

  it('sets a readable CSRF cookie on a normal request', () => {
    const res = response();
    csrfMiddleware({ method: 'GET', headers: {} }, res, () => undefined);
    expect(String(res.headers.get('Set-Cookie'))).toContain('assethub_csrf=');
  });

  it('rejects an authenticated mutation without the token', () => {
    const res = response();
    expect(() => csrfMiddleware({ method: 'POST', headers: { cookie: 'assethub_tenant_access=access', origin: 'http://localhost:3000' } }, res, () => undefined)).toThrow(ForbiddenException);
  });

  it('rejects an authenticated mutation from an untrusted origin even with a matching token', () => {
    const token = 'a'.repeat(64);
    const res = response();
    expect(() => csrfMiddleware({ method: 'POST', headers: { cookie: `assethub_csrf=${token}; assethub_tenant_access=access`, origin: 'https://attacker.example', 'x-csrf-token': token } }, res, () => undefined)).toThrow(ForbiddenException);
  });

  it('accepts an authenticated mutation with a matching token and trusted development origin', () => {
    const token = 'a'.repeat(64);
    const res = response();
    csrfMiddleware({ method: 'POST', headers: { cookie: `assethub_csrf=${token}; assethub_tenant_access=access`, origin: 'http://localhost:3000', 'x-csrf-token': token } }, res, () => undefined);
    expect(String(res.headers.get('Set-Cookie'))).toContain(`assethub_csrf=${token}`);
  });
});
