import { notFound } from "next/navigation";

/**
 * Where the player gate sends a player URL requested on a host that does not
 * serve players.
 *
 * The proxy rewrites to this route instead of redirecting, so the browser keeps
 * the URL it asked for while the response is a real 404 with the app's not-found
 * page — which is what a typed URL and a crawler both have to see for the URL to
 * count as "does not exist here". Opening the path directly hits the same 404.
 */
export default function PlayerNotFoundPage() {
  notFound();
}
