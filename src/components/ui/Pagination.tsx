import Link from "next/link";
import { fmt, type Dictionary } from "@/i18n";

export function Pagination({ page, pages, basePath, params, dict }: { page: number; pages: number; basePath: string; params: Record<string, string>; dict: Dictionary }) {
  if (pages <= 1) return null;
  const href = (p: number) => {
    const sp = new URLSearchParams(params);
    if (p > 1) sp.set("page", String(p));
    else sp.delete("page");
    const q = sp.toString();
    return q ? `${basePath}?${q}` : basePath;
  };
  return (
    <nav className="mt-8 flex items-center justify-between gap-4" aria-label="Pagination">
      {page > 1 ? <Link className="btn-ghost" href={href(page - 1)} rel="prev">{dict.search.prev}</Link> : <span />}
      <span className="text-sm text-ink-500">{fmt(dict.search.page, { page, pages })}</span>
      {page < pages ? <Link className="btn-ghost" href={href(page + 1)} rel="next">{dict.search.next}</Link> : <span />}
    </nav>
  );
}
