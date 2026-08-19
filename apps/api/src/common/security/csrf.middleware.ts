import * as crypto from 'crypto';
import { ForbiddenException } from '@nestjs/common';

export const CSRF_COOKIE = 'assethub_csrf';
export const CSRF_HEADER = 'x-csrf-token';

function parseCookies(header?: string): Record<string, string[]> {
  if (!header) return {};
  return header.split(';').reduce<Record<string, string[]>>((acc, part) => {
    const index = part.indexOf('=');
    if (index <= 0) return acc;
    const key = part.slice(0, index).trim();
    const value = part.slice(index + 1).trim();
    if (!key) return acc;
    try {
      (acc[key] ??= []).push(decodeURIComponent(value));
    } catch {
      (acc[key] ??= []).push(value);
    }
    return acc;
  }, {});
}

function cookieDomain(req: any): string {
  const host = String(req?.headers?.host ?? '').split(':')[0].trim().toLowerCase();
  const root = (process.env.TENANT_ROOT_DOMAIN ?? process.env.NEXT_PUBLIC_TENANT_ROOT_DOMAIN ?? '').trim().replace(/^\.+|\.+$/g, '').toLowerCase();
  if (!root || !host || /^(localhost|127\.0\.0\.1)$/i.test(host)) return '';
  if (host === root || host.endsWith(`.${root}`)) return `; Domain=.${root}`;
  return '';
}

function cookieOptions(req: any) {
  const domain = cookieDomain(req);
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
  return `${domain}; Path=/; Max-Age=86400; SameSite=Lax${secure}`;
}

function legacyCookieCleanup(req: any) {
  const domain = cookieDomain(req);
  return [
    `${CSRF_COOKIE}=;${domain}; Path=/api/v1; Max-Age=0; SameSite=Lax`,
    `${CSRF_COOKIE}=;${domain}; Path=/api/v1/auth; Max-Age=0; SameSite=Lax`,
  ];
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
  try { origin = new URL(value); } catch { return false; }
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
function isAuthenticationTransition(path: string): boolean { return path === '/auth/login' || path === '/auth/system/login'; }
function isSessionRefresh(path: string): boolean { return path === '/auth/refresh'; }
function hasAuthenticationCookie(req: any): boolean {
  const cookies = parseCookies(req?.headers?.cookie);
  return Boolean(cookies.assethub_tenant_access?.length || cookies.assethub_tenant_refresh?.length || cookies.assethub_system_access?.length || cookies.assethub_system_refresh?.length);
}

export function csrfMiddleware(req: any, res: any, next: () => void) {
  const cookies = parseCookies(req?.headers?.cookie);
  const csrfTokens = cookies[CSRF_COOKIE] ?? [];
  const token = csrfTokens.find((value) => value.length >= 32) ?? crypto.randomBytes(32).toString('hex');
  const csrfCookie = `${CSRF_COOKIE}=${encodeURIComponent(token)}${cookieOptions(req)}`;

  const originalSetHeader = res.setHeader.bind(res);
  let csrfCookieSent = false;

  const ensureCsrfCookie = () => {
    if (csrfCookieSent) return;
    const existing = res.getHeader?.('Set-Cookie');
    const values = Array.isArray(existing) ? [...existing] : existing ? [existing] : [];
    if (!values.some((item: unknown) => String(item).startsWith(`${CSRF_COOKIE}=`) && !String(item).includes('Max-Age=0'))) values.push(csrfCookie);
    for (const cleanup of legacyCookieCleanup(req)) if (!values.some((item: unknown) => String(item) === cleanup)) values.push(cleanup);
    originalSetHeader('Set-Cookie', values);
    csrfCookieSent = true;
  };

  res.setHeader = (name: string, value: unknown) => {
    if (String(name).toLowerCase() === 'set-cookie') {
      const values = Array.isArray(value) ? [...value] : [value];
      if (!values.some((item: unknown) => String(item).startsWith(`${CSRF_COOKIE}=`) && !String(item).includes('Max-Age=0'))) values.push(csrfCookie);
      for (const cleanup of legacyCookieCleanup(req)) if (!values.some((item: unknown) => String(item) === cleanup)) values.push(cleanup);
      csrfCookieSent = true;
      return originalSetHeader(name, values);
    }
    return originalSetHeader(name, value);
  };

  ensureCsrfCookie();

  if (isMutating(req?.method ?? '')) {
    const path = String(req?.originalUrl ?? req?.url ?? '').split('?')[0].replace(/^\/api\/v1/, '') || '/';
    const origin = browserOrigin(req);

    if (isAuthenticationTransition(path)) {
      if (origin && !isTrustedBrowserOrigin(origin)) throw new ForbiddenException('CSRF origin validation failed');
      return next();
    }

    if (isSessionRefresh(path)) {
      if (!origin || !isTrustedBrowserOrigin(origin)) throw new ForbiddenException('CSRF origin validation failed');
      return next();
    }

    if (hasAuthenticationCookie(req)) {
      if (!origin || !isTrustedBrowserOrigin(origin)) throw new ForbiddenException('CSRF origin validation failed');
      const supplied = String(req?.headers?.[CSRF_HEADER] ?? '');
      if (!supplied || !csrfTokens.some((candidate) => constantTimeEqual(candidate, supplied))) throw new ForbiddenException('CSRF token validation failed');
    }
  }

  next();
}
