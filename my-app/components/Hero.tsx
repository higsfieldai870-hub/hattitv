import { Suspense } from "react";
import HeroPlayer from "@/components/HeroPlayer";
import HeroActions from "@/components/HeroActions";
import SearchBox from "@/components/SearchBox";
import { playerHref } from "@/lib/playerGate";
import { requestHost } from "@/lib/requestHost";
import { watchLabel, watchPath } from "@/lib/streaming";
import {
  backdropUrl,
  getCategorySlug,
  getDetails,
  getList,
  getMediaType,
  getTitle,
  pickTrailer,
} from "@/lib/tmdb";

/** How far down the trending list to look for a title with a trailer. */
const TRAILER_CANDIDATES = 6;

export default async function Hero() {
  const trending = await getList("/trending/all/week");
  const candidates = trending
    .filter((item) => item.backdrop_path && item.overview)
    .slice(0, TRAILER_CANDIDATES);

  if (candidates.length === 0) return null;

  // The hero exists to play a trailer, so it features the highest-trending
  // title that has one. Lookups stop at the first hit (usually the top title);
  // if none of the candidates has a trailer, the top one keeps its backdrop.
  let featured = candidates[0];
  let trailerKey: string | null = null;
  for (const candidate of candidates) {
    try {
      const details = await getDetails(getMediaType(candidate), candidate.id);
      trailerKey = pickTrailer(details.videos?.results);
    } catch (error) {
      console.error(`Failed to load hero trailer for ${candidate.id}`, error);
    }
    if (trailerKey) {
      featured = candidate;
      break;
    }
  }

  const mediaType = getMediaType(featured);
  const title = getTitle(featured);

  // The CTA has to point wherever the player actually lives: on a host that
  // 404s player URLs that is the mirror, not this origin.
  const host = await requestHost();

  return (
    <section className="relative h-[56vw] max-h-[85vh] min-h-[520px] w-full overflow-hidden">
      <HeroPlayer
        backdrop={backdropUrl(featured.backdrop_path)}
        title={title}
        trailerKey={trailerKey}
      />

      <div className="relative z-10 flex h-full max-w-2xl flex-col justify-end gap-4 px-4 pb-40 md:px-12 md:pb-52">
        <h2 className="text-shadow-hero text-3xl font-extrabold sm:text-5xl md:text-6xl">
          {title}
        </h2>
        <p className="text-shadow-hero line-clamp-3 max-w-xl text-sm text-neutral-200 sm:text-base md:text-lg">
          {featured.overview}
        </p>
        <HeroActions
          watchHref={playerHref(
            host,
            watchPath(getCategorySlug(featured), mediaType, featured.id),
          )}
          infoHref={`/${getCategorySlug(featured)}/${featured.id}`}
          watchLabel={watchLabel(mediaType)}
        />

        {/* useSearchParams needs a boundary inside this server component. */}
        <Suspense fallback={<div className="h-12 w-full max-w-md" />}>
          <SearchBox variant="hero" placeholder="Search movies, shows, anime…" />
        </Suspense>
      </div>
    </section>
  );
}
