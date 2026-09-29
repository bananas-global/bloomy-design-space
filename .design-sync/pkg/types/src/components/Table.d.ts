import type { ReactNode } from "react";
/** O slot `:col`: `label` e `class`, e o conteúdo (`:let`) vira `render`. */
export type TableCol<I> = {
    label?: string;
    className?: string;
    render: (item: I) => ReactNode;
};
/**
 * `core_components.ex` → `table/1`.
 * Os slots `:col` e `:action` viram as props `col` e `action`, listas na ordem
 * em que os slots seriam escritos.
 */
export declare function Table<T, I = T>({ id, className, rows, rowId, rowClick, emptyMessage, rowItem, col, action, }: {
    id: string;
    className?: string;
    rows: T[];
    rowId?: (row: T) => string;
    rowClick?: (row: T) => void;
    emptyMessage?: string;
    rowItem?: (row: T) => I;
    col: TableCol<I>[];
    action?: ((item: I) => ReactNode)[];
}): import("react").JSX.Element;
/**
 * `core_components.ex` → `simple_table/1`.
 * `empty_message` existe no attr, mas o original não o renderiza.
 */
export declare function SimpleTable({ className, children, }: {
    className?: string;
    emptyMessage?: string;
    children: ReactNode;
}): import("react").JSX.Element;
