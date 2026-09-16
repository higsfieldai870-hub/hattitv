import { CARD_GRID, CARD_ROW_WIDTH } from "@/components/MediaCard";

export function HeroSkeleton() {
  return (
    <div className="relative h-[56vw] max-h-[85vh] min-h-[520px] w-full animate-pulse bg-neutral-800">
      <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-brand-black to-transparent" />
      <div className="relative z-10 flex h-full max-w-2xl flex-col justify-end gap-4 px-4 pb-40 md:px-12 md:pb-52">
        <div className="h-12 w-2/3 rounded bg-neutral-700" />
        <div className="h-4 w-full rounded bg-neutral-700" />
        <div className="h-4 w-4/5 rounded bg-neutral-700" />
        <div className="h-12 w-full max-w-md rounded-full bg-neutral-700" />
      </div>
    </div>
  );
}

/** Poster plus title and meta lines, shaped like a loaded `MediaCard`. */
function CardSkeleton({ className }: { className: string }) {
  return (
    <div className={`animate-pulse ${className}`}>
      <div className="aspect-[2/3] w-full rounded-md bg-neutral-800" />
      <div className="mt-2 h-3.5 w-4/5 rounded bg-neutral-800" />
      <div className="mt-1.5 h-3 w-1/2 rounded bg-neutral-800" />
    </div>
  );
}

export function RowSkeleton({ title }: { title: string }) {
  return (
    <section>
      <h2 className="mb-2 px-4 text-lg font-semibold text-neutral-200 md:px-12 md:text-xl">
        {title}
      </h2>
      <div className="flex gap-3 overflow-hidden px-4 pt-1 pb-6 md:gap-4 md:px-12">
        {Array.from({ length: 10 }).map((_, index) => (
          <CardSkeleton key={index} className={CARD_ROW_WIDTH} />
        ))}
      </div>
    </section>
  );
}

export function GridSkeleton({ title }: { title: string }) {
  return (
    <section className="px-4 md:px-12">
      <h2 className="mb-6 text-xl font-semibold text-neutral-200 md:text-2xl">
        {title}
      </h2>
      <div className={CARD_GRID}>
        {Array.from({ length: 12 }).map((_, index) => (
          <CardSkeleton key={index} className="w-full" />
        ))}
      </div>
    </section>
  );
}
