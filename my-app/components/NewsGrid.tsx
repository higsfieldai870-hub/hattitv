import NewsCard from "@/components/NewsCard";
import type { NewsArticle } from "@/lib/news";

/** The empty state doubles as the failure state — see lib/news. */
export default function NewsGrid({
  articles,
  emptyMessage = "No headlines right now. Please check back shortly.",
}: {
  articles: NewsArticle[];
  emptyMessage?: string;
}) {
  if (articles.length === 0) {
    return <p className="text-sm text-neutral-400">{emptyMessage}</p>;
  }

  return (
    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {articles.map((article) => (
        <NewsCard key={article.url} article={article} />
      ))}
    </div>
  );
}
