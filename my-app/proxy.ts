import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { playerGate } from "@/lib/playerGate";

/**
 * Domain gate for the streaming pages — see `lib/playerGate.ts` for the rule.
 *
 * A player page requested on the main domain is sent to the same path on the
 * mirror (VIDEO_PLAYER_UNBLOCK); a player served *by* the mirror is marked
 * noindex so the throwaway domain can never take over the main domain's URLs.
 *
 * 307 rather than 308 on purpose: the hop is temporary, so search engines keep
 * the main domain's URL as the one that answers the query.
 */
export function proxy(request: NextRequest) {
  // Player pages are only ever fetched. Bouncing a POST/action to another
  // origin would drop its body, so those pass through untouched.
  if (request.method !== "GET" && request.method !== "HEAD") {
    return NextResponse.next();
  }

  const decision = playerGate(
    // Vercel routes by Host; the header also carries the port, which
    // `playerGate` strips before comparing.
    request.headers.get("host") ?? request.nextUrl.host,
    request.nextUrl.pathname,
    request.nextUrl.search,
  );

  if (decision.action === "redirect") {
    const response = NextResponse.redirect(decision.url, 307);
    // An env var can move the mirror, so no CDN may hold on to the hop.
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
