export const TENANT_ACCESS_COOKIE = 'assethub_tenant_access';
export const TENANT_REFRESH_COOKIE = 'assethub_tenant_refresh';
export const SYSTEM_ACCESS_COOKIE = 'assethub_system_access';
export const SYSTEM_REFRESH_COOKIE = 'assethub_system_refresh';

export const LEGACY_ACCESS_COOKIE = 'assethub_access';
export const LEGACY_REFRESH_COOKIE = 'assethub_refresh';

function parseCookies(header?: string): Record<string, string> {
  if (!header) return {};
  return header.split(';').reduce<Record<string, string>>((acc, chunk) => {
    const index = chunk.indexOf('=');
    if (index <= 0) return acc;
    const key = chunk.slice(0, index).trim();
    const value = chunk.slice(index + 1).trim();
    if (key) {
      try {
        acc[key] = decodeURIComponent(value);
      } catch {
        acc[key] = value;
      }
    }
    return acc;
  }, {});
}

export function readCookie(req: any, name: string): string | undefined {
  return parseCookies(req?.headers?.cookie)[name];
}

function requestHost(req?: any): string {
  const forwarded = String(req?.headers?.['x-forwarded-host'] ?? '').split(',')[0].trim();
  const host = forwarded || String(req?.headers?.host ?? '').trim();
  return host.split(':')[0].toLowerCase();
}

function cookieDomain(req?: any): string {
  const host = requestHost(req);
  if (!host || host === 'localhost' || host === '127.0.0.1' || /^\d{1,3}(?:\.\d{1,3}){3}$/.test(host)) return '';

  const root = (process.env.TENANT_ROOT_DOMAIN ?? process.env.NEXT_PUBLIC_TENANT_ROOT_DOMAIN ?? '')
    .trim()
    .replace(/^\.+|\.+$/g, '')
    .toLowerCase();
  if (!root || host === root || !host.endsWith(`.${root}`)) return '';
  return `; Domain=.${root}`;
}

function cookie(name: string, value: string, maxAge: number, path: string, req?: any) {
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
  const domain = cookieDomain(req);
  return `${name}=${encodeURIComponent(value)}; Max-Age=${maxAge}; Path=${path}${domain}; HttpOnly; SameSite=Lax${secure}`;
}

export function setTenantAuthCookies(res: any, accessToken: string, refreshToken: string, req?: any) {
  res.setHeader('Set-Cookie', [
    cookie(TENANT_ACCESS_COOKIE, accessToken, 10 * 60, '/api/v1', req),
    cookie(TENANT_REFRESH_COOKIE, refreshToken, 30 * 24 * 60 * 60, '/api/v1/auth', req),
    cookie(SYSTEM_ACCESS_COOKIE, '', 0, '/api/v1', req),
    cookie(SYSTEM_REFRESH_COOKIE, '', 0, '/api/v1/auth', req),
    cookie(LEGACY_ACCESS_COOKIE, '', 0, '/api/v1', req),
    cookie(LEGACY_REFRESH_COOKIE, '', 0, '/api/v1/auth', req),
  ]);
}

export function setSystemAuthCookies(res: any, accessToken: string, refreshToken: string, req?: any) {
  res.setHeader('Set-Cookie', [
    cookie(SYSTEM_ACCESS_COOKIE, accessToken, 10 * 60, '/api/v1', req),
    cookie(SYSTEM_REFRESH_COOKIE, refreshToken, 30 * 24 * 60 * 60, '/api/v1/auth', req),
    cookie(TENANT_ACCESS_COOKIE, '', 0, '/api/v1', req),
    cookie(TENANT_REFRESH_COOKIE, '', 0, '/api/v1/auth', req),
    cookie(LEGACY_ACCESS_COOKIE, '', 0, '/api/v1', req),
    cookie(LEGACY_REFRESH_COOKIE, '', 0, '/api/v1/auth', req),
  ]);
}

export function clearAuthCookies(res: any, req?: any) {
  res.setHeader('Set-Cookie', [
    cookie(TENANT_ACCESS_COOKIE, '', 0, '/api/v1', req),
    cookie(TENANT_REFRESH_COOKIE, '', 0, '/api/v1/auth', req),
    cookie(SYSTEM_ACCESS_COOKIE, '', 0, '/api/v1', req),
    cookie(SYSTEM_REFRESH_COOKIE, '', 0, '/api/v1/auth', req),
    cookie(LEGACY_ACCESS_COOKIE, '', 0, '/api/v1', req),
    cookie(LEGACY_REFRESH_COOKIE, '', 0, '/api/v1/auth', req),
  ]);
}

export function clearTenantAuthCookies(res: any, req?: any) {
  res.setHeader('Set-Cookie', [
    cookie(TENANT_ACCESS_COOKIE, '', 0, '/api/v1', req),
    cookie(TENANT_REFRESH_COOKIE, '', 0, '/api/v1/auth', req),
    cookie(LEGACY_ACCESS_COOKIE, '', 0, '/api/v1', req),
    cookie(LEGACY_REFRESH_COOKIE, '', 0, '/api/v1/auth', req),
  ]);
}

export function clearSystemAuthCookies(res: any, req?: any) {
  res.setHeader('Set-Cookie', [
    cookie(SYSTEM_ACCESS_COOKIE, '', 0, '/api/v1', req),
    cookie(SYSTEM_REFRESH_COOKIE, '', 0, '/api/v1/auth', req),
    cookie(LEGACY_ACCESS_COOKIE, '', 0, '/api/v1', req),
    cookie(LEGACY_REFRESH_COOKIE, '', 0, '/api/v1/auth', req),
  ]);
}
