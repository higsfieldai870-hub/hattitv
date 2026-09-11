import ArticleTime from "@/components/ArticleTime";
import type { NewsArticle } from "@/lib/news";

/**
 * One headline. These link off-site, so they are plain <a> tags with
 * noopener/noreferrer rather than next/link.
 */
export default function NewsCard({ article }: { article: NewsArticle }) {
  return (
    <article className="group h-full overflow-hidden rounded-lg border border-white/10 bg-brand-surface/60 transition hover:border-brand/60 focus-within:border-brand/60">
      <a
        href={article.url}
        target="_blank"
        rel="noopener noreferrer"
        className="flex h-full flex-col focus:outline-none"
      >
        <div className="relative aspect-video w-full overflow-hidden bg-neutral-800">
          {article.image ? (
            <img
              src={article.image}
              alt=""
              loading="lazy"
              decoding="async"
              className="absolute inset-0 h-full w-full object-cover transition duration-300 group-hover:scale-105"
            />
          ) : (
            <div className="flex h-full items-center justify-center px-3 text-center text-xs text-neutral-500">
              {article.source}
            </div>
          )}
        </div>

        <div className="flex flex-1 flex-col gap-2 p-4">
          <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] tracking-wide text-neutral-400 uppercase">
            <span className="font-semibold text-brand-bright">
              {article.source}
            </span>
            {article.publishedAt ? (
              <>
                <span aria-hidden>·</span>
                <ArticleTime iso={article.publishedAt} />
              </>
            ) : null}
          </p>

          <h3 className="text-sm leading-snug font-semibold text-white transition group-hover:text-brand-bright">
            {article.title}
          </h3>

          {article.description ? (
            <p className="line-clamp-3 text-sm leading-relaxed text-neutral-400">
              {article.description}
            </p>
          ) : null}
        </div>
      </a>
    </article>
  );
}
