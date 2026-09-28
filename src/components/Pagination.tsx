import type { ReactNode } from "react";
import { Icon } from "./Icon.js";

/**
 * `pagination_components.ex` → `render/1` (`pagination/1`).
 *
 * `paginate` (evento do LiveView) vira `onPaginate`; sem ele, cada página é um
 * link `?page=N`, como o `patch` do original (que também ignora `path`). As
 * setas não navegam, como lá.
 */

export type PaginationMeta = { currentPage: number; totalPages: number };

/** `get_pagination_range/3`. */
export function getPaginationRange(currentPage: number, totalPages: number, maxPages = 3): [number, number] {
  const additional = Math.ceil(maxPages / 2);
  if (totalPages === 0) return [1, 1];
  if (maxPages >= totalPages) return [1, totalPages];
  if (currentPage + additional > totalPages) return [totalPages - maxPages + 1, totalPages];
  const first = Math.max(currentPage - additional + 1, 1);
  const last = Math.min(first + maxPages - 1, totalPages);
  return [first, last];
}

function NavigateItem({ active = false, children }: { active?: boolean; children: ReactNode }) {
  return (
    <li
      className={[
        "w-8 h-8 rounded-lg text-sm font-bold flex items-center justify-center border",
        "hover:bg-brand-purple-dark/10 hover:border-brand-purple-dark/10 hover:cursor-pointer",
        active ? "text-brand-blue-dark border-brand-blue-dark" : "text-brand-purple-dark/80 border-transparent",
      ].join(" ")}
    >
      {children}
    </li>
  );
}

export function Pagination({
  meta,
  onPaginate,
  pageParam = "page",
}: {
  /** Existe no `attr`, mas o original não o usa. */
  path?: string;
  meta: PaginationMeta;
  onPaginate?: (page: number) => void;
  pageParam?: string;
}) {
  const [first, last] = getPaginationRange(meta.currentPage, meta.totalPages);
  const range = Array.from({ length: Math.max(last - first + 1, 0) }, (_, i) => first + i);

  const item = (page: number) => {
    const inner = <NavigateItem active={page === meta.currentPage}>{page}</NavigateItem>;
    if (onPaginate)
      return (
        <div key={page} onClick={() => onPaginate(page)} data-page={page}>
          {inner}
        </div>
      );
    return (
      <a key={page} href={`?${encodeURIComponent(pageParam)}=${page}`}>
        {inner}
      </a>
    );
  };

  return (
    <nav>
      <ul className="flex gap-2">
        <NavigateItem>
          <Icon name="fa-chevron-left" />
        </NavigateItem>

        {first > 1 && item(1)}

        {first > 2 && (
          <NavigateItem>
            <Icon name="fa-ellipsis" />
          </NavigateItem>
        )}

        {range.map(item)}

        {last < meta.totalPages - 1 && (
          <NavigateItem>
            <Icon name="fa-ellipsis" />
          </NavigateItem>
        )}

        {last < meta.totalPages && item(meta.totalPages)}

        <NavigateItem>
          <Icon name="fa-chevron-right" />
        </NavigateItem>
      </ul>
    </nav>
  );
}
