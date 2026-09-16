/**
 * Remote images the Next.js optimizer (/_next/image) is allowed to fetch.
 *
 * next.config.ts turns this list into `images.remotePatterns`, and components
 * whose URLs can come from anywhere ask `canOptimize()` first — a URL outside
 * the list would get a 400 from the optimizer and render as a broken image.
 * Each entry is a billed transformation source, so it stays deliberately
 * narrow: news thumbnails from arbitrary publishers are served as-is.
 */
export const OPTIMIZED_IMAGE_SOURCES = [
  { hostname: "image.tmdb.org", pathname: "/t/p/" },
  {
    hostname: new URL(process.env.STREAMED_BASE_URL ?? "https://streamed.pk")
      .hostname,
    pathname: "/api/images/",
  },
];

/** True for site-local paths and for https URLs from an allowed source. */
export function canOptimize(src: string): boolean {
  if (src.startsWith("/") && !src.startsWith("//")) return true;

  let url: URL;
  try {
    url = new URL(src);
  } catch {
    return false;
  }

  return (
    url.protocol === "https:" &&
    !url.search &&
    OPTIMIZED_IMAGE_SOURCES.some(
      (source) =>
        url.hostname === source.hostname &&
        url.pathname.startsWith(source.pathname),
    )
  );
}
