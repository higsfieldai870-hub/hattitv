"use client";

import { useCallback, useSyncExternalStore } from "react";

/**
 * Publication date in the viewer's own timezone.
 *
 * Same trick as KickoffTime: the server has no timezone, so it renders UTC and
 * the client swaps to local right after hydration. useSyncExternalStore is
 * what makes the handover safe — React uses the server snapshot while
 * hydrating, so the two renders never disagree.
 */
function format(iso: string, timeZone?: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    ...(timeZone ? { timeZone } : {}),
  }).format(new Date(iso));
}

/** The value is fixed for a given date, so there is nothing to subscribe to. */
const noSubscribe = () => () => {};

export default function ArticleTime({
  iso,
  className,
}: {
  /** ISO 8601 timestamp. */
  iso: string;
  className?: string;
}) {
  const local = useCallback(() => format(iso), [iso]);
  const utc = useCallback(() => `${format(iso, "UTC")} UTC`, [iso]);
  const label = useSyncExternalStore(noSubscribe, local, utc);

  return (
    <time dateTime={iso} className={className}>
      {label}
    </time>
  );
}
