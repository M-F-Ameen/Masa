import { headers } from 'next/headers';
import { env } from '../config/env';

/**
 * Decides whether session/state cookies should carry the `Secure` flag.
 *
 * Browsers silently discard `Secure` cookies when the page is served over
 * plain HTTP (except on `localhost`). A production deployment that is plainly
 * reachable at e.g. `http://192.168.1.183:1234` would therefore lose the
 * session cookie on every navigation and appear to log the user out.
 *
 * We infer the scheme from `X-Forwarded-Proto`, which reverse proxies set when
 * terminating TLS, falling back to non-secure for direct HTTP access. Set
 * `COOKIE_SECURE` to force the value when auto-detection is not enough.
 */
export async function shouldUseSecureCookies(): Promise<boolean> {
  if (env.COOKIE_SECURE !== undefined) return env.COOKIE_SECURE;
  return isHttpsRequest();
}

async function isHttpsRequest(): Promise<boolean> {
  try {
    const proto = (await headers()).get('x-forwarded-proto');
    if (proto) return proto.split(',')[0]!.trim().toLowerCase() === 'https';
  } catch {
    // headers() is unavailable outside a request context; default to insecure.
  }
  return false;
}
