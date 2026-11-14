// request.ts — who may call this function, and whether a call is a dry
// run (handover 14/11/2026, task C).
//
// verify_jwt=true only asks for a valid JWT, and the site's publishable
// key is one: on 14/11 an anonymous visitor ran nx-network-sync and
// cj-sync, and both wrote to the database. Now a call must carry
//   * X-Internal-Key: <INTERNAL_SYNC_KEY>, or
//   * Authorization: Bearer <SUPABASE_SERVICE_ROLE_KEY>,
// the same rule as source-alert. Anything else gets 401.
//
// The same file sits in nx-network-sync/ and cj-sync/ (each function is
// deployed on its own); tests/edgeRequest.test.js checks they match.
// No imports, so plain Node can test it too.

type Keys = { internalKey?: string | null; serviceRoleKey?: string | null };

/** Compares two strings in time that does not depend on where they differ. */
function sameSecret(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/** True only for the internal key or the service-role key. */
export function isAuthorized(headers: Headers, keys: Keys): boolean {
  const internalKey = (keys.internalKey || '').trim();
  const serviceRoleKey = (keys.serviceRoleKey || '').trim();
  const internal = (headers.get('x-internal-key') || '').trim();
  if (internalKey && internal && sameSecret(internal, internalKey)) return true;
  const auth = (headers.get('authorization') || '').trim();
  const bearer = auth.toLowerCase().startsWith('bearer ') ? auth.slice(7).trim() : '';
  return Boolean(serviceRoleKey && bearer && sameSecret(bearer, serviceRoleKey));
}

const YES = new Set(['1', 'true', 'yes']);
const yes = (v: unknown) => v === true || (typeof v === 'string' && YES.has(v.trim().toLowerCase()));

/**
 * A dry run reads and reports, and writes nothing. Accepted forms:
 *   body {"dryRun": true} or {"dry_run": true} (also "1" / "true");
 *   query ?dry_run=1 or ?dryRun=1 (also true / yes).
 * On 14/11 {"dry_run": true} was ignored and the call wrote.
 */
export function wantsDryRun(url: string, body: unknown): boolean {
  let params: URLSearchParams | null = null;
  try {
    params = new URL(url).searchParams;
  } catch { /* no query */ }
  if (params && (yes(params.get('dry_run')) || yes(params.get('dryRun')))) return true;
  if (body && typeof body === 'object') {
    const b = body as Record<string, unknown>;
    if (yes(b.dryRun) || yes(b.dry_run)) return true;
  }
  return false;
}
