/**
 * Where the player pages are allowed to exist.
 *
 * The same build runs on two hosts: the public domain, which keeps the search
 * traffic and the ad pages, and a throwaway mirror that serves the streams. A
 * player URL on the public domain is a 404 — typed, bookmarked or crawled it
 * simply is not there — so the links the site renders itself point straight at
 * the mirror and a click still plays.
 *
 *   VIDEO_PLAYER_BLOCKED   hosts where player URLs 404          (hattitv.com)
 *   VIDEO_PLAYER_UNBLOCK   the host that serves them            (hattitv.vercel.app)
 *
 * Both accept a comma-separated list. `www.` and the port are ignored when
 * comparing, so "hattitv.com" also covers "www.hattitv.com", and a scheme in
 * the unblock value is honoured ("http://localhost:3000" for local mirrors).
 * Leave VIDEO_PLAYER_BLOCKED empty to switch the gate off entirely.
 *
 * `proxy.ts` imports this module, so it has to stay free of `next/headers` and
 * `next/navigation`: `lib/requestHost.ts` reads the host for server components,
 * and the proxy rewrites a blocked URL to `app/player-not-found/page.tsx`.
 */

/**
 * Routes whose only purpose is playing a full title or a live match. Trailer
 * pages are deliberately absent — they embed YouTube, not a stream, so they
 * stay on the main domain. Add `|watch-trailer` to the first pattern to move
 * them too.
 */
const PLAYER_PATHS = [
  // /movies/550/watch-movie, /tv-shows/1399/watch-series, /anime/65733/watch-series
  /^\/[^/]+\/[^/]+\/watch-(?:movie|series)\/?$/,
  // /sports/football/{matchId} — the fixture player, not /sports or /sports/football
  /^\/sports\/[^/]+\/[^/]+\/?$/,
];

/** True for a path that streams a title or a live match. */
export function isPlayerPath(pathname: string): boolean {
  return PLAYER_PATHS.some((pattern) => pattern.test(pathname));
}

/**
 * A host list entry ("hattitv.com", "https://hattitv.vercel.app:443/x") reduced
 * to a bare, comparable hostname.
 */
function toHostname(entry: string): string | null {
  const value = entry.trim().toLowerCase();
  if (!value) return null;
  try {
    const { hostname } = new URL(
      value.includes("://") ? value : `https://${value}`,
    );
    return hostname.replace(/^www\./, "") || null;
  } catch {
    return null;
  }
}

/** An incoming `Host` header reduced the same way, so the two can be compared. */
function normalizeHost(host: string | null | undefined): string | null {
  if (!host) return null;
  // A proxy chain can append to the header; only the first entry is ours.
  const first = host.split(",")[0] ?? "";
  const bare = first
    .trim()
    .toLowerCase()
    .replace(/:\d+$/, "")
    .replace(/^www\./, "")
    .replace(/\.$/, "");
  return bare || null;
}

function hostList(value: string | undefined): string[] {
  return (value ?? "")
    .split(",")
    .map(toHostname)
    .filter((host): host is string => Boolean(host));
}

/** Hosts where the player routes do not exist. Empty switches the gate off. */
function blockedHosts(): string[] {
  return hostList(process.env.VIDEO_PLAYER_BLOCKED);
}

/** Hosts that serve the player routes. */
function mirrorHosts(): string[] {
  return hostList(process.env.VIDEO_PLAYER_UNBLOCK);
}

/**
 * The first VIDEO_PLAYER_UNBLOCK entry as an origin, ready to prefix a path
 * with. Only the first one is used: a redirect has a single destination.
 */
export function unblockOrigin(): string | null {
  const [first] = (process.env.VIDEO_PLAYER_UNBLOCK ?? "")
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
  if (!first) return null;

  try {
    // A scheme-less value gets https; an explicit one (localhost) is kept.
    return new URL(first.includes("://") ? first : `https://${first}`).origin;
  } catch {
    return null;
  }
}

/** True when this host must not serve players: their URLs 404 here. */
export function isPlayerBlockedHost(host: string | null | undefined): boolean {
  const current = normalizeHost(host);
  return Boolean(current) && blockedHosts().includes(current as string);
}

/** True for the mirror — the host that does serve players. */
export function isPlayerMirrorHost(host: string | null | undefined): boolean {
  const current = normalizeHost(host);
  return Boolean(current) && mirrorHosts().includes(current as string);
}

/**
 * The origin that serves player pages for this request: the mirror on a host
 * that blocks them, and "" on a host that serves them itself (the mirror, a
 * preview deployment, local dev). Every link to a player page goes through
 * `playerHref`, so a click works on either host.
 */
export function playerOrigin(host: string | null | undefined): string {
  if (!isPlayerBlockedHost(host)) return "";
  return unblockOrigin() ?? "";
}

/** A player path, made absolute on the mirror when this host does not serve it. */
export function playerHref(
  host: string | null | undefined,
  path: string,
): string {
  return `${playerOrigin(host)}${path}`;
}

export type PlayerGateDecision =
  /** Serve the request normally. */
  | { action: "allow" }
  /** The URL does not exist here: answer 404 without rendering the page. */
  | { action: "notFound" }
  /** Serve it, but tell crawlers to leave the mirror's copy alone. */
  | { action: "noindex" };

/**
 * The whole rule, in one place:
 *
 *   blocked host + player path   → 404. A typed URL, a bookmark and a crawler
 *                                  all get the same answer as a URL that never
 *                                  existed, while the site's own links point at
 *                                  the mirror so a click still plays
 *   blocked host + anything else → the page the main domain is for
 *   mirror host                  → players play, marked noindex so the
 *                                  temporary domain can never replace the main
 *                                  one in search results
 *   any other host (localhost, preview deployment) → untouched
 */
export function playerGate(
  host: string | null | undefined,
  pathname: string,
): PlayerGateDecision {
  // No blocked host configured: the gate is off, which is what local `next dev`
  // and a single-domain deployment both want.
  if (!blockedHosts().length) return { action: "allow" };

  if (isPlayerBlockedHost(host)) {
    // Blocking with no mirror would 404 every player with nowhere for the
    // traffic to go, so the gate stays open rather than taking it all down.
    if (!unblockOrigin()) {
      console.warn(
        "[player-gate] VIDEO_PLAYER_BLOCKED is set but VIDEO_PLAYER_UNBLOCK is not — serving player pages directly.",
      );
      return { action: "allow" };
    }
    // Everything except the players themselves is a page this host is for.
    return isPlayerPath(pathname) ? { action: "notFound" } : { action: "allow" };
  }

  return isPlayerMirrorHost(host) ? { action: "noindex" } : { action: "allow" };
}
