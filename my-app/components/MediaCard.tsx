import Image from "next/image";
import Link from "next/link";
import type { CardItem } from "@/lib/tmdb";

/** Fixed poster widths for horizontal rows; `CARD_GRID` sizes grid cards. */
export const CARD_ROW_WIDTH = "w-30 flex-none sm:w-36 md:w-40 lg:w-44 xl:w-48";
const ROW_SIZES =
  "(min-width: 1280px) 192px, (min-width: 1024px) 176px, (min-width: 768px) 160px, (min-width: 640px) 144px, 120px";
const GRID_SIZES = "(min-width: 640px) 240px, 33vw";

/**
 * Wrapping poster grid: three across on phones, then as many ~150px columns as
 * fit, so it works both full-width and next to the watch page's poster.
 */
export const CARD_GRID =
  "grid grid-cols-3 gap-x-3 gap-y-6 sm:grid-cols-[repeat(auto-fill,minmax(9.5rem,1fr))] sm:gap-x-4";

/**
 * Poster card with the title always printed underneath, linking to
 * /{category}/{id}, e.g. /movies/1061474 or /hindi-movies/447362.
 */
export default function MediaCard({
  item,
  variant = "row",
}: {
  item: CardItem;
  /** "row" has a fixed width for carousels; "grid" fills its `CARD_GRID` cell. */
  variant?: "row" | "grid";
}) {
  return (
    <Link
      href={`/${item.category}/${item.id}`}
      title={item.title}
      className={`group block text-left focus:outline-none ${variant === "row" ? CARD_ROW_WIDTH : "w-full"}`}
    >
      <div className="relative aspect-[2/3] w-full overflow-hidden rounded-md bg-neutral-800 ring-brand transition group-hover:ring-2 group-focus-visible:ring-2">
        {item.image ? (
          <Image
            src={item.image}
            alt={item.title}
            fill
            sizes={variant === "row" ? ROW_SIZES : GRID_SIZES}
            className="object-cover transition-transform duration-300 ease-out group-hover:scale-105 group-focus-visible:scale-105"
          />
        ) : (
          <div className="flex h-full items-center justify-center px-2 text-center text-xs text-neutral-500">
            {item.title}
          </div>
        )}

        {item.rating ? (
          <span className="absolute top-1.5 left-1.5 rounded bg-brand px-1.5 py-0.5 text-[11px] leading-none font-bold text-white shadow">
            ★ {(item.rating / 10).toFixed(1)}
          </span>
        ) : null}

        <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition duration-300 group-hover:opacity-100 group-focus-visible:opacity-100">
          <span
            aria-hidden
            className="flex h-11 w-11 items-center justify-center rounded-full bg-brand pl-0.5 text-lg text-white shadow-lg"
          >
            ▶
          </span>
        </div>
      </div>

      <p className="mt-2 line-clamp-2 text-[13px] leading-snug font-semibold text-white transition group-hover:text-brand-bright group-focus-visible:text-brand-bright sm:text-sm">
        {item.title}
      </p>
      <p className="mt-0.5 flex items-center gap-1.5 text-[11px] text-neutral-400 sm:text-xs">
        {item.year ? (
          <>
            <span>{item.year}</span>
            <span aria-hidden>•</span>
          </>
        ) : null}
        <span>{item.mediaType === "tv" ? "Series" : "Movie"}</span>
      </p>
    </Link>
  );
}
