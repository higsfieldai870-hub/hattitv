import type { Metadata } from "next";
import Link from "next/link";
import NewsGrid from "@/components/NewsGrid";
import { NEWS_TOPICS, getNews } from "@/lib/news";
import { SITE_NAME, breadcrumbLd, jsonLd } from "@/lib/site";

/** Matches the cache in lib/news — no point rendering fresher than the data. */
export const revalidate = 3600;

const TITLE = "Movie & Sports News";
const DESCRIPTION = `The latest movie and sports headlines, updated hourly on ${SITE_NAME}.`;

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/news" },
  openGraph: {
    title: `${TITLE} — ${SITE_NAME}`,
    description: DESCRIPTION,
    url: "/news",
    type: "website",
  },
};

/** A preview row per topic; the topic page has the full list. */
const PREVIEW_COUNT = 8;

export default async function NewsPage() {
  const sections = await Promise.all(
    NEWS_TOPICS.map(async (topic) => ({
      topic,
      articles: (await getNews(topic)).slice(0, PREVIEW_COUNT),
    })),
  );

  const crumbs = breadcrumbLd([
    { name: "Home", path: "/" },
    { name: "News", path: "/news" },
  ]);

  return (
    <div className="min-h-screen px-4 pt-24 pb-16 md:px-12 md:pt-28">
      <script type="application/ld+json" dangerouslySetInnerHTML={jsonLd(crumbs)} />

      <h1 className="text-2xl font-bold md:text-3xl">{TITLE}</h1>
      <p className="mt-2 max-w-2xl text-sm text-neutral-400">{DESCRIPTION}</p>

      <div className="mt-10 space-y-12">
        {sections.map(({ topic, articles }) => (
          <section key={topic.slug} aria-labelledby={`news-${topic.slug}`}>
            <div className="mb-5 flex flex-wrap items-baseline justify-between gap-3">
              <h2
                id={`news-${topic.slug}`}
                className="text-lg font-bold text-white md:text-xl"
              >
                {topic.heading}
              </h2>
              <Link
                href={`/news/${topic.slug}`}
                className="text-sm font-medium text-brand-bright transition hover:text-white"
              >
                See all {topic.label.toLowerCase()} →
              </Link>
            </div>
            <NewsGrid articles={articles} />
          </section>
        ))}
      </div>
    </div>
  );
}
