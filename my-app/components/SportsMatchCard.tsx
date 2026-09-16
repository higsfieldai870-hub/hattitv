import Image from "next/image";
import Link from "next/link";
import KickoffTime from "@/components/KickoffTime";
import { canOptimize } from "@/lib/images";
import {
  isLive,
  sportIcon,
  type SportsMatch,
  type SportsTeam,
} from "@/lib/sports";

/** One side's crest, or the sport's icon when the feed has no badge. */
function Crest({ team, sport }: { team: SportsTeam | null; sport: string }) {
  return team?.badge ? (
    <Image
      src={team.badge}
      alt=""
      aria-hidden
      width={56}
      height={56}
      unoptimized={!canOptimize(team.badge)}
      className="h-10 w-10 object-contain drop-shadow-lg sm:h-14 sm:w-14"
    />
  ) : (
    <span aria-hidden className="text-2xl opacity-40 sm:text-3xl">
      {sportIcon(sport)}
    </span>
  );
}

/** The two crests facing off, used when a fixture has no poster art. */
function BadgeFace({ match }: { match: SportsMatch }) {
  return (
    <div className="absolute inset-0 flex items-center justify-center gap-3 bg-gradient-to-br from-neutral-900 via-black to-brand-deep/40 px-3 sm:gap-4">
      {match.home || match.away ? (
        <>
          <Crest team={match.home} sport={match.sport} />
          <span
            aria-hidden
            className="text-[10px] font-black tracking-widest text-neutral-500 sm:text-xs"
          >
            VS
          </span>
          <Crest team={match.away} sport={match.sport} />
        </>
      ) : (
        // Races, cards and channels have no sides, just the sport.
        <span aria-hidden className="text-4xl opacity-40">
          {sportIcon(match.sport)}
        </span>
      )}
    </div>
  );
}

/**
 * Fixture card with the full title printed under the art, linking to
 * /sports/{sport}/{matchId}.
 *
 * That URL only exists on the host that serves players, so callers pass the
 * mirror's origin (`playerOrigin()`) when they are rendering on one that does
 * not: the card then points straight at the mirror instead of this host's 404.
 */
export default function SportsMatchCard({
  match,
  origin = "",
}: {
  match: SportsMatch;
  origin?: string;
}) {
  const live = isLive(match);

  return (
    <Link
      href={`${origin}/sports/${match.sport}/${match.id}`}
      title={match.title}
      className="group block w-full text-left focus:outline-none"
    >
      <div className="relative aspect-video w-full overflow-hidden rounded-md bg-neutral-900 ring-brand transition group-hover:ring-2 group-focus-visible:ring-2">
        {match.poster ? (
          <Image
            src={match.poster}
            alt={match.title}
            fill
            sizes="(min-width: 640px) 320px, 50vw"
            unoptimized={!canOptimize(match.poster)}
            className="object-cover transition-transform duration-300 ease-out group-hover:scale-105 group-focus-visible:scale-105"
          />
        ) : (
          <BadgeFace match={match} />
        )}

        {live ? (
          <span className="absolute top-1.5 left-1.5 flex items-center gap-1 rounded bg-brand px-1.5 py-1 text-[10px] leading-none font-bold tracking-wider text-white uppercase shadow-lg">
            <span
              aria-hidden
              className="h-1.5 w-1.5 animate-pulse rounded-full bg-white"
            />
            Live
          </span>
        ) : null}

        {match.popular ? (
          <span className="absolute top-1.5 right-1.5 rounded bg-white px-1.5 py-1 text-[10px] leading-none font-bold tracking-wider text-brand uppercase shadow-lg">
            Popular
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
        {match.title}
      </p>
      <p className="mt-0.5 flex items-center gap-1.5 text-[11px] text-neutral-400 sm:text-xs">
        <span aria-hidden>{sportIcon(match.sport)}</span>
        <span className="truncate capitalize">
          {match.sport.replace(/-/g, " ")}
        </span>
        {live || match.date ? (
          <span aria-hidden className="flex-none">
            •
          </span>
        ) : null}
        {live ? (
          <span className="flex-none font-semibold text-brand-bright">
            Live now
          </span>
        ) : match.date ? (
          <KickoffTime date={match.date} className="flex-none" />
        ) : null}
      </p>
    </Link>
  );
}
