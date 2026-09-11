import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import NewsGrid from "@/components/NewsGrid";
import { NEWS_TOPICS, getNews, getNewsTopic } from "@/lib/news";
import { SITE_NAME, breadcrumbLd, jsonLd } from "@/lib/site";

export const revalidate = 3600;

export function generateStaticParams() {
  return NEWS_TOPICS.map((topic) => ({ topic: topic.slug }));
}

export async function generateMetadata({
  params,
}: PageProps<"/news/[topic]">): Promise<Metadata> {
  const { topic: slug } = await params;
  const topic = getNewsTopic(slug);
  if (!topic) return { title: "Not found", robots: { index: false } };

  return {
    title: topic.heading,
    description: topic.description,
    alternates: { canonical: `/news/${topic.slug}` },
    openGraph: {
      title: `${topic.heading} — ${SITE_NAME}`,
      description: topic.description,
      url: `/news/${topic.slug}`,
      type: "website",
    },
  };
}

export default async function NewsTopicPage({
  params,
}: PageProps<"/news/[topic]">) {
  const { topic: slug } = await params;
  const topic = getNewsTopic(slug);
  if (!topic) notFound();

  const articles = await getNews(topic);

  const crumbs = breadcrumbLd([
    { name: "Home", path: "/" },
    { name: "News", path: "/news" },
    { name: topic.heading, path: `/news/${topic.slug}` },
  ]);

  return (
    <div className="min-h-screen px-4 pt-24 pb-16 md:px-12 md:pt-28">
      <script type="application/ld+json" dangerouslySetInnerHTML={jsonLd(crumbs)} />

      <h1 className="text-2xl font-bold md:text-3xl">{topic.heading}</h1>
      <p className="mt-2 max-w-2xl text-sm text-neutral-400">
        {topic.description}
      </p>

      {/* Switching topics is the main thing anyone does from here. */}
      <nav aria-label="News categories" className="mt-6 flex flex-wrap gap-2">
        {NEWS_TOPICS.map((entry) => {
          const active = entry.slug === topic.slug;
          return (
            <Link
              key={entry.slug}
              href={`/news/${entry.slug}`}
              aria-current={active ? "page" : undefined}
              className={`rounded-full border px-4 py-1.5 text-sm transition ${
                active
                  ? "border-brand bg-brand font-semibold text-white"
                  : "border-white/15 bg-white/5 text-neutral-300 hover:border-brand/60 hover:text-white"
              }`}
            >
              {entry.label}
            </Link>
          );
        })}
      </nav>

      <div className="mt-8">
        <NewsGrid articles={articles} />
      </div>
    </div>
  );
}
