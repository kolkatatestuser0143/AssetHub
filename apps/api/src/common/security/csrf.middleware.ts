import * as crypto from 'crypto';
import { ForbiddenException } from '@nestjs/common';

export const CSRF_COOKIE = 'assethub_csrf';
export const CSRF_HEADER = 'x-csrf-token';

function parseCookies(header?: string): Record<string, string> {
  if (!header) return {};
  return header.split(';').reduce<Record<string, string>>((acc, part) => {
    const index = part.indexOf('=');
    if (index <= 0) return acc;
    const key = part.slice(0, index).trim();
    const value = part.slice(index + 1).trim();
    if (key) acc[key] = decodeURIComponent(value);
    return acc;
  }, {});
}

function cookieOptions() {
  const root = (process.env.TENANT_ROOT_DOMAIN ?? process.env.NEXT_PUBLIC_TENANT_ROOT_DOMAIN ?? '').trim().replace(/^\.+|\.+$/g, '');
  const domain = root && !/^(localhost|127\.0\.0\.1)$/i.test(root) ? `; Domain=.${root}` : '';
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
  // The CSRF token is intentionally readable by the web app so it can be
  // echoed in X-CSRF-Token for authenticated state-changing requests.
  return `${domain}; Path=/; Max-Age=86400; SameSite=Lax${secure}`;
}

function configuredOrigins(): string[] {
  return (process.env.WEB_ORIGINS ?? process.env.WEB_ORIGIN ?? '')
    .split(',')
    .map((value) => value.trim().replace(/\/$/, ''))
    .filter(Boolean);
}

function isTrustedBrowserOrigin(value: string): boolean {
  if (!value || value === 'null') return false;
  const configured = configuredOrigins();
  if (configured.includes(value.replace(/\/$/, ''))) return true;
  if (process.env.NODE_ENV !== 'production' && /^https?:\/\/(localhost|127\.0\.0\.1)(?::\d+)?$/i.test(value)) return true;

  let origin: URL;
  try {
    origin = new URL(value);
  } catch {
    return false;
  }
  if (!['http:', 'https:'].includes(origin.protocol)) return false;

  const root = (process.env.TENANT_ROOT_DOMAIN ?? process.env.NEXT_PUBLIC_TENANT_ROOT_DOMAIN ?? '').trim().replace(/^\.+|\.+$/g, '').toLowerCase();
  if (!root || origin.hostname.toLowerCase() === root) return false;

  return origin.hostname.toLowerCase().endsWith(`.${root}`)
    && origin.hostname.split('.').length === root.split('.').length + 1;
}

function browserOrigin(req: any): string | undefined {
  const origin = String(req?.headers?.origin ?? '').trim();
  if (origin) return origin;
  const referer = String(req?.headers?.referer ?? '').trim();
  if (!referer) return undefined;
  try { return new URL(referer).origin; } catch { return undefined; }
}

function constantTimeEqual(left: string, right: string): boolean {
  const a = Buffer.from(left);
  const b = Buffer.from(right);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

function isMutating(method: string): boolean { return ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method.toUpperCase()); }

function hasAuthenticationCookie(req: any): boolean {
  const cookies = parseCookies(req?.headers?.cookie);
  return Boolean(cookies.assethub_tenant_access || cookies.assethub_tenant_refresh || cookies.assethub_system_access || cookies.assethub_system_refresh);
}

export function csrfMiddleware(req: any, res: any, next: () => void) {
  const cookies = parseCookies(req?.headers?.cookie);
  let token = cookies[CSRF_COOKIE];
  if (!token || token.length < 32) token = crypto.randomBytes(32).toString('hex');
  const csrfCookie = `${CSRF_COOKIE}=${encodeURIComponent(token)}${cookieOptions()}`;

  const originalSetHeader = res.setHeader.bind(res);
  res.setHeader = (name: string, value: unknown) => {
    if (String(name).toLowerCase() === 'set-cookie') {
      const values = Array.isArray(value) ? [...value] : [value];
      if (!values.some((item: unknown) => String(item).startsWith(`${CSRF_COOKIE}=`))) values.push(csrfCookie);
      return originalSetHeader(name, values);
    }
    return originalSetHeader(name, value);
  };

  if (isMutating(req?.method ?? '') && hasAuthenticationCookie(req)) {
    const origin = browserOrigin(req);
    if (!origin || !isTrustedBrowserOrigin(origin)) throw new ForbiddenException('CSRF origin validation failed');
    const supplied = String(req?.headers?.[CSRF_HEADER] ?? '');
    if (!supplied || !constantTimeEqual(token, supplied)) throw new ForbiddenException('CSRF token validation failed');
  }

  next();
}
