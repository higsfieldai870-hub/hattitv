import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { playerGate } from "@/lib/playerGate";

/**
 * Domain gate for the player pages — the rule itself lives in
 * `lib/playerGate.ts`.
 *
 * A player URL that does not belong on this host is rewritten to a route that
 * calls `notFound()`, so a typed URL, a bookmark and a crawler all get a plain
 * 404 while the address bar keeps the URL they asked for. The mirror's own
 * responses are marked noindex, so the throwaway domain can never take over the
 * main domain's search results.
 *
 * Nothing on the site links to a player URL on a blocked host: those links are
 * built with `playerHref()` and point at the mirror directly.
 */
export function proxy(request: NextRequest) {
  // Player pages are only ever fetched. Rewriting an action request would send
  // it to a route that 404s and drop its body, so those pass through.
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
  );

  if (decision.action === "notFound") {
    return NextResponse.rewrite(new URL("/player-not-found", request.url));
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
