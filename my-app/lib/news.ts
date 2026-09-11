/**
 * Movie and sports headlines, from NewsAPI.
 *
 * Two quirks of the free "Developer" plan shape everything here:
 *
 *   1. 100 requests/day. Each topic is fetched at one fixed page size and
 *      cached for an hour, so the whole site costs ~48 requests/day no matter
 *      how much traffic it gets. Slicing a cached list is free; asking for a
 *      different pageSize is a different URL, and a second request.
 *   2. The plan is licensed for development use. A production host can get a
 *      426 back, so every failure here is caught and surfaced as an empty
 *      list — a news outage must never take a page down with it.
 *
 * NEWSAPI_KEY is read server-side only (no NEXT_PUBLIC_ prefix) and sent as a
 * header rather than a query param, so it stays out of URLs and access logs.
 */

const BASE_URL = "https://newsapi.org/v2";

/** One request per topic per hour keeps us well inside the daily quota. */
const REVALIDATE = 3600;

/** Fixed so every page shares one cached response per topic. */
const PAGE_SIZE = 24;

export interface NewsArticle {
  title: string;
  description: string | null;
  url: string;
  image: string | null;
  /** ISO 8601, as returned by NewsAPI. */
  publishedAt: string;
  source: string;
}

export interface NewsTopic {
  slug: string;
  /** Navbar / tab wording. */
  label: string;
  heading: string;
  description: string;
  /** NewsAPI endpoint and query for this topic. */
  endpoint: "top-headlines" | "everything";
  params: Record<string, string>;
}

export const NEWS_TOPICS: NewsTopic[] = [
  {
    slug: "movies",
    label: "Movie News",
    heading: "Movie News",
    description:
      "The latest movie and cinema headlines — releases, trailers, casting and box office.",
    endpoint: "everything",
    // "everything" searches the article body by default, which drags in any
    // story that happens to use the word "movie" once. Scoping the match to
    // the headline is what keeps this a film feed rather than a keyword feed.
    params: {
      q: 'movie OR film OR cinema OR "box office"',
      searchIn: "title",
      language: "en",
      sortBy: "publishedAt",
    },
  },
  {
    slug: "sports",
    label: "Sports News",
    heading: "Sports News",
    description:
      "Live sports headlines — football, basketball, cricket, UFC and more.",
    endpoint: "top-headlines",
    params: { category: "sports", language: "en" },
  },
];

export function getNewsTopic(slug: string): NewsTopic | undefined {
  return NEWS_TOPICS.find((topic) => topic.slug === slug);
}

export function hasNewsKey(): boolean {
  return Boolean(process.env.NEWSAPI_KEY?.trim());
}

interface NewsApiArticle {
  title: string | null;
  description: string | null;
  url: string | null;
  urlToImage: string | null;
  publishedAt: string | null;
  source?: { name?: string | null };
}

interface NewsApiResponse {
  status: string;
  articles?: NewsApiArticle[];
  message?: string;
}

/**
 * NewsAPI keeps takedowns in the feed as literal "[Removed]" rows, and an
 * article with no link is not something we can render.
 */
function normalize(article: NewsApiArticle): NewsArticle | null {
  const title = article.title?.trim();
  const url = article.url?.trim();
  if (!title || !url || title === "[Removed]") return null;

  return {
    title,
    description: article.description?.trim() || null,
    url,
    image: article.urlToImage?.trim() || null,
    publishedAt: article.publishedAt ?? "",
    source: article.source?.name?.trim() || "Unknown source",
  };
}

/** Headlines for one topic. Returns [] rather than throwing, by design. */
export async function getNews(topic: NewsTopic): Promise<NewsArticle[]> {
  const key = process.env.NEWSAPI_KEY?.trim();
  if (!key) return [];

  const url = new URL(`${BASE_URL}/${topic.endpoint}`);
  for (const [name, value] of Object.entries(topic.params)) {
    url.searchParams.set(name, value);
  }
  url.searchParams.set("pageSize", String(PAGE_SIZE));

  try {
    const res = await fetch(url, {
      headers: { "X-Api-Key": key },
      next: { revalidate: REVALIDATE },
    });

    if (!res.ok) {
      // 426 means the key is development-only and this host is not localhost.
      console.error(
        `NewsAPI ${topic.slug} failed: ${res.status} ${res.statusText}`,
      );
      return [];
    }

    const data = (await res.json()) as NewsApiResponse;
    if (data.status !== "ok" || !data.articles) {
      console.error(`NewsAPI ${topic.slug} error: ${data.message ?? "unknown"}`);
      return [];
    }

    return data.articles
      .map(normalize)
      .filter((article): article is NewsArticle => article !== null);
  } catch (error) {
    console.error(`NewsAPI ${topic.slug} request threw`, error);
    return [];
  }
}
