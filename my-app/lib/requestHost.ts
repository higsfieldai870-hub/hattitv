import { headers } from "next/headers";

/**
 * The host this request arrived on, as the player gate needs it.
 *
 * `x-forwarded-host` is what the platform's proxy saw before it rewrote the
 * request, so it wins when set; `host` is the fallback Next hands through.
 * Reading headers opts the calling route into dynamic rendering — every page
 * that needs this already is, except the two hubs that link to the mirror.
 */
export async function requestHost(): Promise<string | null> {
  const headerList = await headers();
  return headerList.get("x-forwarded-host") ?? headerList.get("host");
}
