/**
 * Which host is allowed to serve the video-player pages.
 *
 * The same build runs on two hosts: the public domain, which keeps the search
 * traffic and must never carry the embeds, and a throwaway mirror that does the
 * streaming. `proxy.ts` calls the pure decision function below on every request
 * so the hop happens before anything renders.
 *
 *   VIDEO_PLAYER_BLOCKED   hosts that must not serve a player    (hattitv.com)
 *   VIDEO_PLAYER_UNBLOCK   hosts that may, and receive the hop   (hattitv.vercel.app)
 *
 * Both accept a comma-separated list. `www.` and the port are ignored when
 * comparing, so "hattitv.com" also covers "www.hattitv.com", and a scheme in
 * the unblock value is honoured ("http://localhost:3000" for local mirrors).
 * Leave VIDEO_PLAYER_BLOCKED empty to switch the gate off entirely.
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

export type PlayerGateDecision =
  /** Serve the request normally. */
  | { action: "allow" }
  /** Send this player page to the mirror, keeping its path and query. */
  | { action: "redirect"; url: string }
  /** Serve it, but tell crawlers to leave the mirror's copy alone. */
  | { action: "noindex" };

/**
 * The whole rule, in one place:
 *
 *   blocked host + player path  → redirect to the mirror (307, so the main
 *                                 domain stays the URL that answers)
 *   blocked host + anything else → normal page, main domain keeps its content
 *   mirror host                 → normal player, marked noindex so the
 *                                 temporary domain can never replace the main
 *                                 one in search results
 *   any other host (localhost, preview deployment) → untouched
 */
export function playerGate(
  host: string | null | undefined,
  pathname: string,
  search = "",
): PlayerGateDecision {
  const blocked = hostList(process.env.VIDEO_PLAYER_BLOCKED);
  // No blocked host configured: the gate is off, which is what local `next dev`
  // and a single-domain deployment both want.
  if (!blocked.length) return { action: "allow" };

  const current = normalizeHost(host);
  if (!current) return { action: "allow" };

  if (!blocked.includes(current)) {
    return hostList(process.env.VIDEO_PLAYER_UNBLOCK).includes(current)
      ? { action: "noindex" }
      : { action: "allow" };
  }

  // The main domain keeps every page except the players themselves.
  if (!isPlayerPath(pathname)) return { action: "allow" };

  const origin = unblockOrigin();
  if (!origin) {
    // Blocking with no mirror would 404 every player on the site, so the gate
    // stays open rather than taking playback down.
    console.warn(
      "[player-gate] VIDEO_PLAYER_BLOCKED is set but VIDEO_PLAYER_UNBLOCK is not — serving player pages directly.",
    );
    return { action: "allow" };
  }

  return { action: "redirect", url: `${origin}${pathname}${search}` };
}
