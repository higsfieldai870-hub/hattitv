/**
 * Where the player pages are allowed to exist.
 *
 * The same build runs on two hosts, and each is the other's mirror image:
 *
 *   the public domain  is the site. Search traffic, title pages, news, search
 *                      and ads all live here, and a player URL is a 404 — typed,
 *                      bookmarked or crawled, it simply is not there.
 *   the mirror         exists to play. Every link to a player is built with
 *                      `playerHref()` and points at it. Its home page renders
 *                      too, so the bare domain is not a dead hop, but any other
 *                      URL on it (a title page, search, news) sends the visitor
 *                      back to the public domain.
 *
 *   VIDEO_PLAYER_BLOCKED   public hosts: players 404, everything else lives
 *                          (hattitv.com)
 *   VIDEO_PLAYER_UNBLOCK   the mirror: players and the home page render,
 *                          everything else bounces (hattitv.vercel.app)
 *
 * Both accept a comma-separated list. `www.` and the port are ignored when
 * comparing, so "hattitv.com" also covers "www.hattitv.com", and a scheme in
 * either value is honoured ("http://localhost:3000" for local mirrors). The
 * first entry of each list is the one used for redirects. Leave
 * VIDEO_PLAYER_BLOCKED empty to switch the gate off entirely.
 *
 * `proxy.ts` imports this module, so it has to stay free of `next/headers` and
 * `next/navigation`: `lib/requestHost.ts` reads the host for server components,
 * and the proxy rewrites a blocked player URL to `app/player-not-found`.
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
 * The one non-player page the mirror renders itself: its home page, so the bare
 * domain opens on the site rather than bouncing. Every link on it except the
 * hero's "Play" (a player, built with `playerHref()`) leads back to the public
 * domain through the redirect below.
 */
function isMirrorHomePath(pathname: string): boolean {
  return pathname === "/";
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
 * The first entry of a comma-separated env value as an origin, ready to prefix a
 * path with. Only the first one is used: a redirect has a single destination.
 */
function firstOrigin(value: string | undefined): string | null {
  const [first] = (value ?? "")
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

/** The mirror's origin: where a player link points on a host that 404s them. */
export function unblockOrigin(): string | null {
  return firstOrigin(process.env.VIDEO_PLAYER_UNBLOCK);
}

/** The public domain as an origin: where the mirror sends everything else. */
export function mainOrigin(): string | null {
  return firstOrigin(process.env.VIDEO_PLAYER_BLOCKED);
}

/**
 * A path on the public domain, query string carried over minus the router's own
 * cache-busting `_rsc` marker, which is not part of the page's URL.
 */
function mainUrlFor(pathname: string, search: string): string | null {
  const origin = mainOrigin();
  if (!origin) return null;

  const target = new URL(pathname, origin);
  const params = new URLSearchParams(search);
  params.delete("_rsc");
  target.search = params.toString();
  return target.toString();
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
  | { action: "noindex" }
  /** Send the visitor to the same path on the public domain. */
  | { action: "redirect"; url: string };

/**
 * The whole rule, in one place:
 *
 *   public host + player path   → 404. A typed URL, a bookmark and a crawler
 *                                 all get the same answer as a URL that never
 *                                 existed, while the site's own links point at
 *                                 the mirror so a click still plays
 *   public host + anything else → the page the public domain is for
 *   mirror host + player path   → plays, marked noindex so the temporary
 *                                 domain can never replace the public one in
 *                                 search results
 *   mirror host + home page     → renders, noindex for the same reason
 *   mirror host + anything else → back to the public domain, so the mirror
 *                                 only ever holds the player and its front door
 *   any other host (localhost, preview deployment) → untouched
 */
export function playerGate(
  host: string | null | undefined,
  pathname: string,
  search = "",
): PlayerGateDecision {
  // No blocked host configured: the gate is off, which is what local `next dev`
  // and a single-domain deployment both want.
  if (!blockedHosts().length) return { action: "allow" };

  const playerPath = isPlayerPath(pathname);

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
    return playerPath ? { action: "notFound" } : { action: "allow" };
  }

  if (isPlayerMirrorHost(host)) {
    if (playerPath || isMirrorHomePath(pathname)) return { action: "noindex" };

    const url = mainUrlFor(pathname, search);
    // Unparseable public origin: better an unindexed page than a dead end.
    return url ? { action: "redirect", url } : { action: "noindex" };
  }

  return { action: "allow" };
}
