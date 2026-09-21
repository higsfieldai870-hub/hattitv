import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { playerGate } from "@/lib/playerGate";

/**
 * Domain gate for the player pages — the rule itself lives in
 * `lib/playerGate.ts`.
 *
 * On the public domain a player URL is rewritten to a route that calls
 * `notFound()`, so a typed URL, a bookmark and a crawler all get a plain 404
 * while the address bar keeps the URL they asked for. On the mirror the
 * opposite happens: players and the home page are served (and marked noindex,
 * so the throwaway domain can never take over the public one in search results)
 * and every other URL is sent back to the public domain.
 *
 * Nothing on the public domain links to a player URL there: those links are
 * built with `playerHref()` and point at the mirror directly.
 */
export function proxy(request: NextRequest) {
  // Pages are only ever fetched. Bouncing an action request would 404 it (or,
  // on the mirror, send it to another origin) and drop its body, so those pass
  // through untouched.
  if (request.method !== "GET" && request.method !== "HEAD") {
    return NextResponse.next();
  }

  const decision = playerGate(
    // Vercel routes by host; the header also carries the port, which
    // `playerGate` strips before comparing.
    request.headers.get("x-forwarded-host") ??
      request.headers.get("host") ??
      request.nextUrl.host,
    request.nextUrl.pathname,
    request.nextUrl.search,
  );

  if (decision.action === "notFound") {
    return NextResponse.rewrite(new URL("/player-not-found", request.url));
  }

  if (decision.action === "redirect") {
    // 307: the mirror is a temporary address, so nothing may cache the hop.
    const response = NextResponse.redirect(decision.url, 307);
    response.headers.set("cache-control", "no-store");
    return response;
  }

  if (decision.action === "noindex") {
    const response = NextResponse.next();
    response.headers.set("x-robots-tag", "noindex, follow");
    return response;
  }

  return NextResponse.next();
}

export const config = {
  // Every page has to be seen (the players, the pages linking to them, and the
  // mirror's copies of both), but there is nothing to decide for build output,
  // static files or the JSON passthrough.
  matcher: [
    "/((?!_next/static|_next/image|api/|.*\\.(?:ico|png|jpg|jpeg|svg|gif|webp|avif|woff|woff2|txt|xml|json|webmanifest)$).*)",
  ],
};
