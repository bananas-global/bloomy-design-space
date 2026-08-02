import type { ReactNode } from "react";

/**
 * Tabela e tabela simples — espelho de `table/1`, `simple_table/1` e
 * `table_class/1`.
 *
 * O invólucro carrega o estilo inteiro em seletores descendentes: cabeçalho com
 * fundo `brand-blue/20`, divisórias em `brand-purple-dark/10`, células com
 * `text-brand-purple-dark/80`. Portado como está, num lugar só, para que as duas
 * tabelas continuem iguais como são lá.
 *
 * **A linha de vazio é a parte que mais ensina.** No original ela existe sempre,
 * escondida, e só aparece quando é a primeira do corpo:
 *
 * ```heex
 * <tr class="hidden first:table-row">
 *   <td colspan={length(@col)}>Nenhum dado encontrado para a pesquisa</td>
 * </tr>
 * ```
 *
 * É CSS resolvendo o estado vazio, sem condicional no servidor. Aqui a mesma
 * coisa: a linha é renderizada sempre, com as mesmas classes, e quem decide se
 * ela aparece é o navegador.
 */

const CLASSE_TABELA = [
  "w-full rounded-lg border border-[var(--color-brand-purple-dark)]/10 overflow-y-auto overflow-x-auto",
  "[&_table]:w-full [&_table]:border-collapse [&_table]:rounded-lg",
  "[&_thead]:border-b [&_thead]:border-[var(--color-brand-purple-dark)]/10",
  "[&_thead_th]:bg-[var(--color-brand-blue)]/20 [&_thead_th]:px-3 [&_thead_th]:py-4 [&_thead_th]:text-left [&_thead_th]:text-[var(--color-brand-purple-dark)]",
  "[&_tbody]:relative [&_tbody]:divide-y [&_tbody]:divide-[var(--color-brand-purple-dark)]/10 [&_tbody]:border-t [&_tbody]:border-[var(--color-brand-purple-dark)]/10",
  "[&_tbody_tr]:hover:bg-[var(--color-brand-purple-dark)]/5",
  "[&_tbody_tr_td]:relative [&_tbody_tr_td]:px-3 [&_tbody_tr_td]:py-4 [&_tbody_tr_td]:text-left [&_tbody_tr_td]:text-[var(--color-brand-purple-dark)]/80",
].join(" ");

export const MENSAGEM_VAZIO = "Nenhum dado encontrado para a pesquisa";

export type Coluna<T> = {
  label: string;
  className?: string;
  render: (linha: T) => ReactNode;
};

export function Table<T>({
  id,
  rows,
  rowId,
  cols,
  actions,
  onRowClick,
  className,
}: {
  id?: string;
  rows: T[];
  rowId?: (linha: T) => string;
  cols: Coluna<T>[];
  actions?: (linha: T) => ReactNode;
  onRowClick?: (linha: T) => void;
  className?: string;
}) {
  return (
    <div className={[CLASSE_TABELA, className].filter(Boolean).join(" ")}>
      <table>
        <thead>
          <tr>
            {cols.map((col) => (
              <th key={col.label}>{col.label}</th>
            ))}
            {actions && (
              <th className="relative p-0 pb-4">
                <span className="sr-only">Ações</span>
              </th>
            )}
          </tr>
        </thead>
        <tbody id={id}>
          {rows.map((linha, i) => (
            <tr key={rowId?.(linha) ?? i} id={rowId?.(linha)}>
              {cols.map((col) => (
                <td
                  key={col.label}
                  onClick={onRowClick ? () => onRowClick(linha) : undefined}
                  className={[onRowClick && "hover:cursor-pointer", col.className]
                    .filter(Boolean)
                    .join(" ")}
                >
                  {col.render(linha)}
                </td>
              ))}
              {actions && (
                <td className="relative w-14 p-0">
                  <div className="relative whitespace-nowrap py-4 text-right">
                    <span className="relative ml-4 font-semibold leading-6 text-[var(--color-brand-purple-dark)]/80 hover:text-[var(--color-brand-purple-dark)]">
                      {actions(linha)}
                    </span>
                  </div>
                </td>
              )}
            </tr>
          ))}

          {/* Sempre renderizada, escondida por padrão: `first:table-row` a
              revela só quando ela é a primeira linha do corpo — ou seja, quando
              não há dado nenhum. */}
          <tr className="hidden first:table-row">
            <td
              colSpan={cols.length + (actions ? 1 : 0)}
              className="px-3 py-4 text-center! text-[var(--color-brand-purple-dark)]/40"
            >
              {MENSAGEM_VAZIO}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

/** Tabela sem ações nem clique de linha, para leitura. */
export function SimpleTable({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={[CLASSE_TABELA, className].filter(Boolean).join(" ")}>
      <table>{children}</table>
    </div>
  );
}
