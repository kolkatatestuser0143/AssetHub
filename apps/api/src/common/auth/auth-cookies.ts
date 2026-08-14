export const TENANT_ACCESS_COOKIE = 'assethub_tenant_access';
export const TENANT_REFRESH_COOKIE = 'assethub_tenant_refresh';
export const SYSTEM_ACCESS_COOKIE = 'assethub_system_access';
export const SYSTEM_REFRESH_COOKIE = 'assethub_system_refresh';

// Legacy cookie names from the pre-split cookie implementation.
// These are accepted only during migration, then immediately replaced
// with the scoped cookies above and cleared from the browser.
export const LEGACY_ACCESS_COOKIE = 'assethub_access';
export const LEGACY_REFRESH_COOKIE = 'assethub_refresh';

function parseCookies(header?: string): Record<string, string> {
  if (!header) return {};
  return header.split(';').reduce<Record<string, string>>((acc, chunk) => {
    const index = chunk.indexOf('=');
    if (index <= 0) return acc;
    const key = chunk.slice(0, index).trim();
    const value = chunk.slice(index + 1).trim();
    if (key) acc[key] = decodeURIComponent(value);
    return acc;
  }, {});
}

export function readCookie(req: any, name: string): string | undefined {
  return parseCookies(req?.headers?.cookie)[name];
}

function cookie(name: string, value: string, maxAge: number, path: string) {
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
  return `${name}=${encodeURIComponent(value)}; Max-Age=${maxAge}; Path=${path}; HttpOnly; SameSite=Strict${secure}`;
}

export function setTenantAuthCookies(res: any, accessToken: string, refreshToken: string) {
  res.setHeader('Set-Cookie', [
    cookie(TENANT_ACCESS_COOKIE, accessToken, 10 * 60, '/api/v1'),
    cookie(TENANT_REFRESH_COOKIE, refreshToken, 30 * 24 * 60 * 60, '/api/v1/auth'),
  ]);
}

export function setSystemAuthCookies(res: any, accessToken: string, refreshToken: string) {
  res.setHeader('Set-Cookie', [
    cookie(SYSTEM_ACCESS_COOKIE, accessToken, 10 * 60, '/api/v1'),
    cookie(SYSTEM_REFRESH_COOKIE, refreshToken, 30 * 24 * 60 * 60, '/api/v1/auth'),
  ]);
}

export function clearAuthCookies(res: any) {
  res.setHeader('Set-Cookie', [
    cookie(TENANT_ACCESS_COOKIE, '', 0, '/api/v1'),
    cookie(TENANT_REFRESH_COOKIE, '', 0, '/api/v1/auth'),
    cookie(SYSTEM_ACCESS_COOKIE, '', 0, '/api/v1'),
    cookie(SYSTEM_REFRESH_COOKIE, '', 0, '/api/v1/auth'),
    cookie(LEGACY_ACCESS_COOKIE, '', 0, '/api/v1'),
    cookie(LEGACY_REFRESH_COOKIE, '', 0, '/api/v1/auth'),
  ]);
}

export function clearTenantAuthCookies(res: any) {
  res.setHeader('Set-Cookie', [
    cookie(TENANT_ACCESS_COOKIE, '', 0, '/api/v1'),
    cookie(TENANT_REFRESH_COOKIE, '', 0, '/api/v1/auth'),
    cookie(LEGACY_ACCESS_COOKIE, '', 0, '/api/v1'),
    cookie(LEGACY_REFRESH_COOKIE, '', 0, '/api/v1/auth'),
  ]);
}

export function clearSystemAuthCookies(res: any) {
  res.setHeader('Set-Cookie', [
    cookie(SYSTEM_ACCESS_COOKIE, '', 0, '/api/v1'),
    cookie(SYSTEM_REFRESH_COOKIE, '', 0, '/api/v1/auth'),
    cookie(LEGACY_ACCESS_COOKIE, '', 0, '/api/v1'),
    cookie(LEGACY_REFRESH_COOKIE, '', 0, '/api/v1/auth'),
  ]);
}
