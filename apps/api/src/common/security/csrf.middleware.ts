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
  return `${domain}; Path=/api/v1; Max-Age=86400; SameSite=Lax${secure}`;
}

function constantTimeEqual(left: string, right: string): boolean {
  const a = Buffer.from(left);
  const b = Buffer.from(right);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

function isMutating(method: string): boolean {
  return ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method.toUpperCase());
}

function hasAuthenticationCookie(req: any): boolean {
  const cookies = parseCookies(req?.headers?.cookie);
  return Boolean(
    cookies.assethub_tenant_access ||
    cookies.assethub_tenant_refresh ||
    cookies.assethub_system_access ||
    cookies.assethub_system_refresh,
  );
}

/**
 * Protects cookie-authenticated state-changing requests from same-site and
 * cross-site CSRF. The token cookie is deliberately readable by the web app;
 * authentication cookies remain HttpOnly.
 */
export function csrfMiddleware(req: any, res: any, next: () => void) {
  const cookies = parseCookies(req?.headers?.cookie);
  let token = cookies[CSRF_COOKIE];
  if (!token || token.length < 32) token = crypto.randomBytes(32).toString('hex');

  const existing = res.getHeader?.('Set-Cookie');
  const csrfCookie = `${CSRF_COOKIE}=${encodeURIComponent(token)}${cookieOptions()}`;
  const setCookies = Array.isArray(existing) ? [...existing] : existing ? [existing] : [];
  if (!setCookies.some((value: string) => value.startsWith(`${CSRF_COOKIE}=`))) setCookies.push(csrfCookie);
  res.setHeader('Set-Cookie', setCookies);

  if (isMutating(req?.method ?? '') && hasAuthenticationCookie(req)) {
    const supplied = String(req?.headers?.[CSRF_HEADER] ?? '');
    if (!supplied || !constantTimeEqual(token, supplied)) {
      throw new ForbiddenException('CSRF validation failed');
    }
  }

  next();
}
