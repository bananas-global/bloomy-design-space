/**
 * A grade das visões por dia (Profissional e Sala): largura fixa por coluna
 * e bordas só à direita e embaixo de cada célula (a de fora é do contêiner).
 * Com `border-separate`, a coluna das horas fica fixa ao rolar sem perder a
 * borda; por isso o fundo dela é opaco. Com colunas, o contêiner acompanha a
 * largura da tabela, sem vão à direita quando ela é mais estreita que a página.
 */
import type { ReactNode } from "react";

const HOUR_COL = 56;
const COLUMN = 160;

const cx = (...classes: (string | false | null | undefined)[]) => classes.filter(Boolean).join(" ");

export const dailyHeadCell = "sticky left-0 z-10 bg-neutral-50";

export const dailyHourCell = "sticky left-0 z-10 bg-white text-brand-purple-dark/80 text-center";

export function DailyGrid({ columns, children }: { columns: string[]; children: ReactNode }) {
  return (
    <div className={cx("overflow-x-auto rounded-lg border border-brand-purple-dark/10", columns.length > 0 ? "w-fit max-w-full" : "w-full")}>
      <table
        className={cx(
          "table-fixed border-separate border-spacing-0",
          "[&_td]:border-b [&_td]:border-r [&_td]:border-brand-purple-dark/10",
          "[&_tr>td:last-child]:border-r-0 [&_tbody>tr:last-child>td]:border-b-0",
        )}
        style={{ width: columns.length > 0 ? HOUR_COL + columns.length * COLUMN : "100%" }}
      >
        <colgroup>
          <col style={{ width: HOUR_COL }} />
          {columns.map((id) => (
            <col key={id} style={{ width: COLUMN }} />
          ))}
        </colgroup>
        {children}
      </table>
    </div>
  );
}
