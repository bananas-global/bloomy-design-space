/**
 * `pagination_components.ex` → `render/1` (`pagination/1`).
 *
 * `paginate` (evento do LiveView) vira `onPaginate`; sem ele, cada página é um
 * link `?page=N`, como o `patch` do original (que também ignora `path`). As
 * setas não navegam, como lá.
 */
export type PaginationMeta = {
    currentPage: number;
    totalPages: number;
};
/** `get_pagination_range/3`. */
export declare function getPaginationRange(currentPage: number, totalPages: number, maxPages?: number): [number, number];
export declare function Pagination({ meta, onPaginate, pageParam, }: {
    /** Existe no `attr`, mas o original não o usa. */
    path?: string;
    meta: PaginationMeta;
    onPaginate?: (page: number) => void;
    pageParam?: string;
}): import("react").JSX.Element;
