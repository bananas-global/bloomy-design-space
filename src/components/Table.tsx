import type { ReactNode } from "react";

/** `core_components.ex` → `table_class/1`. */
function tableClass(className?: string) {
  return [
    "w-full rounded-lg border border-brand-purple-dark/10 overflow-y-auto overflow-x-auto",
    "[&_table]:w-full [&_table]:border-collapse [&_table]:rounded-lg",
    "[&_thead]:border-b [&_thead]:border-brand-purple-dark/10",
    "[&_thead_th]:bg-brand-blue/20 [&_thead_th]:px-3 [&_thead_th]:py-4 [&_thead_th]:text-left [&_thead_th]:text-brand-purple-dark",
    "[&_tbody]:relative [&_tbody]:divide-y [&_tbody]:divide-brand-purple-dark/10 [&_tbody]:border-t [&_tbody]:border-brand-purple-dark/10",
    "[&_tbody_tr]:group [&_tbody_tr]:hover:bg-brand-purple-dark/5",
    "[&_tbody_tr_td]:relative [&_tbody_tr_td]:px-3 [&_tbody_tr_td]:py-4 [&_tbody_tr_td]:text-left [&_tbody_tr_td]:text-brand-purple-dark/80",
    className,
  ]
    .filter(Boolean)
    .join(" ");
}

const EMPTY_MESSAGE = "Nenhum dado encontrado para a pesquisa";

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
export function Table<T, I = T>({
  id,
  className,
  rows,
  rowId,
  rowClick,
  emptyMessage = EMPTY_MESSAGE,
  rowItem = (row: T) => row as unknown as I,
  col,
  action = [],
}: {
  id: string;
  className?: string;
  rows: T[];
  rowId?: (row: T) => string;
  rowClick?: (row: T) => void;
  emptyMessage?: string;
  rowItem?: (row: T) => I;
  col: TableCol<I>[];
  action?: ((item: I) => ReactNode)[];
}) {
  return (
    <div className={tableClass(className)}>
      <table>
        <thead>
          <tr>
            {col.map((c, index) => (
              <th key={index}>{c.label}</th>
            ))}
            {action.length > 0 && (
              <th className="relative p-0 pb-4">
                <span className="sr-only">Ações</span>
              </th>
            )}
          </tr>
        </thead>
        <tbody id={id}>
          {rows.map((row, index) => (
            <tr key={rowId?.(row) ?? index} id={rowId?.(row)}>
              {col.map((c, colIndex) => (
                <td
                  key={colIndex}
                  onClick={rowClick && (() => rowClick(row))}
                  className={[rowClick && "hover:cursor-pointer", c.className].filter(Boolean).join(" ") || undefined}
                >
                  {c.render(rowItem(row))}
                </td>
              ))}
              {action.length > 0 && (
                <td className="relative w-14 p-0">
                  <div className="relative whitespace-nowrap py-4 text-right">
                    {action.map((renderAction, actionIndex) => (
                      <span
                        key={actionIndex}
                        className="relative ml-4 font-semibold leading-6 text-brand-purple-dark/80 hover:text-brand-purple-dark"
                      >
                        {renderAction(rowItem(row))}
                      </span>
                    ))}
                  </div>
                </td>
              )}
            </tr>
          ))}

          <tr className="hidden first:table-row">
            <td colSpan={col.length} className="text-center! px-3 py-4 text-brand-purple-dark/40">
              {emptyMessage}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

/**
 * `core_components.ex` → `simple_table/1`.
 * `empty_message` existe no attr, mas o original não o renderiza.
 */
export function SimpleTable({
  className,
  children,
}: {
  className?: string;
  emptyMessage?: string;
  children: ReactNode;
}) {
  return (
    <div className={tableClass(className)}>
      <table>{children}</table>
    </div>
  );
}
