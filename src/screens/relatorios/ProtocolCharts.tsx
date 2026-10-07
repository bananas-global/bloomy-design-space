/**
 * Relatório de protocolo — gráficos do VB-MAPP (`relatorios-protocolo.jsx` e
 * `RfVbLevelBars` de `relatorios-foco.jsx`). Novos — não existem no Phoenix,
 * exceto a grade de marcos, que espelha `vb_mapp_view` do monólito:
 * desenhados em HTML/CSS com tokens do monólito. Os números vêm de
 * `vbDomainRows`, `vbLevelTotals` e `vbTotal` (`model.ts`).
 *
 * Exportado (todos recebem `app: ProtocolApplication`):
 * - `ProtocolSource`: faixa da aplicação de origem com o aproveitamento total.
 * - `VbMilestoneGrid`: grade de marcos por nível, espelho de `vb_mapp_view`
 *   do monólito (5 marcos por domínio, células de 0,5 e 1).
 * - `VbLevelBars`: aproveitamento por nível em barras horizontais, com a marca
 *   da avaliação anterior (a versão da v2; a `VbLevelChart` vertical é da v1).
 * - `VbDomainTable`: pontuação por domínio e variação desde a anterior, sobre o
 *   `Table` do catálogo.
 * - `VbBlock`: bloco com título em caixa alta (`vb-block`).
 */
import type { ReactNode } from "react";
import { Icon } from "../../components/Icon.js";
import { Table } from "../../components/Table.js";
import { VB_DOMAINS, VB_LEVELS, vbDomainRows, vbLevelTotals, vbNum, vbTotal, type ProtocolApplication } from "./model.js";

const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(" ");

/** Bloco com título em caixa alta (`vb-block`). Novo — não existe no Phoenix. */
export function VbBlock({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div>
      <p className="mb-2.5 text-xs font-black tracking-[0.03em] text-brand-purple-dark/50 uppercase">{title}</p>
      {children}
    </div>
  );
}

/** Faixa da aplicação de origem (`vb-source`). Novo — não existe no Phoenix. */
export function ProtocolSource({ app }: { app: ProtocolApplication }) {
  const tot = vbTotal(app.cells);
  return (
    <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl bg-brand-blue/10 p-4">
      <div className="flex items-center gap-3">
        <span className="inline-flex h-10 w-10 flex-none items-center justify-center rounded-[10px] bg-white text-brand-blue-dark">
          <Icon name="fa-clipboard-check" type="solid" />
        </span>
        <div>
          <p className="text-[15px] font-extrabold text-brand-purple-dark">{`${app.protocol} — ${app.instrument}`}</p>
          <p className="mt-0.5 text-xs font-semibold text-brand-purple-dark/60">
            {`Aplicação finalizada em ${app.finishedAt} · ${app.by.name} (${app.by.specialty}) · anterior em ${app.previousAt}`}
          </p>
        </div>
      </div>
      <div className="text-right">
        <span className="block text-[26px]/none font-black text-brand-blue-dark">{`${tot.pct}%`}</span>
        <span className="text-xs font-bold text-brand-purple-dark/55">{`${vbNum(tot.score)} de ${tot.max} marcos`}</span>
      </div>
    </div>
  );
}

/** Rótulos das linhas da grade, de cima para baixo: 05 … 01. */
const VB_ROWS = [5, 4, 3, 2, 1];

/**
 * Grade de marcos por nível. Espelha `vb_mapp_view` do monólito
 * (`patient_live/components/edit_tabs/protocol_executions.ex`): os níveis do
 * último para o primeiro (`Enum.reverse(@groups)`), uma coluna por domínio
 * avaliado no nível, 5 marcos de baixo para cima e duas células por marco — a
 * de baixo pinta com 0,5 e a de cima com 1. Sem o clique que abre a questão
 * (`show_question`), que não tem tela aqui.
 */
export function VbMilestoneGrid({ app }: { app: ProtocolApplication }) {
  const levels = VB_LEVELS.map((level, i) => ({
    level,
    areas: VB_DOMAINS.flatMap((d) => {
      const marks = (app.cells[d.id] ?? [])[i];
      return marks == null ? [] : [{ ...d, marks }];
    }),
  })).reverse();
  return (
    <div className="w-full overflow-y-auto">
      {levels.map(({ level, areas }) => (
        <div key={level.id}>
          <p className="my-2 font-extrabold text-brand-blue-dark">{level.label}</p>
          <div className="flex gap-8 pb-4">
            <div className="flex items-start gap-2 overflow-x-auto">
              <div className="flex shrink-0 flex-col items-end pt-9">
                {VB_ROWS.map((i) => (
                  <div key={i} className="mt-[6px] flex flex-col items-end gap-[3px]">
                    <div className="flex h-6 items-center pr-1">
                      <span className="text-xs font-semibold text-gray-500">{String(i).padStart(2, "0")}</span>
                    </div>
                    <div className="h-6" />
                  </div>
                ))}
              </div>
              {areas.map((area) => (
                <div key={area.id} className="flex flex-col items-center">
                  <p
                    title={area.name}
                    className="mb-2 w-full truncate rounded-t-lg bg-gray-200 px-2 py-1 text-center font-bold text-brand-purple-dark/60"
                  >
                    {area.short}
                  </p>
                  <div className="flex flex-col-reverse gap-[3px]">
                    {area.marks.map((v, m) => (
                      <div key={m} title={`Marco ${m + 1}: ${vbNum(v)}`} className="flex flex-col-reverse gap-[3px]">
                        <div className={cx("h-6 w-32 rounded-sm", v >= 0.5 ? "bg-brand-blue" : "bg-gray-100")} />
                        <div className={cx("h-6 w-32 rounded-sm", v === 1 ? "bg-brand-blue" : "bg-gray-100")} />
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

/** Aproveitamento por nível em barras horizontais (`RfVbLevelBars`). Novo — não existe no Phoenix. */
export function VbLevelBars({ app }: { app: ProtocolApplication }) {
  const totals = vbLevelTotals(app.cells);
  const prev = vbLevelTotals(app.previous);
  return (
    <div className="flex flex-col gap-3.5">
      {totals.map((t, i) => {
        const level = VB_LEVELS[i]!;
        const p = prev[i]?.pct ?? 0;
        const d = t.pct - p;
        return (
          <div key={level.id} className="grid grid-cols-1 items-center gap-1.5 sm:grid-cols-[120px_minmax(0,1fr)_150px] sm:gap-4">
            <div>
              <p className="text-sm font-extrabold text-brand-purple-dark">{level.label}</p>
              <p className="mt-px text-xs text-brand-purple-dark/55">{level.sub}</p>
            </div>
            <div className="relative h-3 rounded-full bg-brand-purple-dark/8" title={`Atual: ${t.pct}% · Avaliação de ${app.previousAt}: ${p}%`}>
              <div className="h-full rounded-full bg-blue transition-[width] duration-300 ease-in-out" style={{ width: `${t.pct}%` }} />
              <span aria-hidden className="absolute -top-1 -bottom-1 -ml-[1.5px] w-[3px] rounded-xs bg-brand-purple-dark/45" style={{ left: `${p}%` }} />
            </div>
            <div>
              <p className="text-sm font-extrabold text-brand-purple-dark">{`${t.pct}%`}</p>
              <p className="mt-px text-xs text-brand-purple-dark/55">{`${vbNum(t.score)} de ${t.max}${d !== 0 ? ` · ${d > 0 ? "+" : ""}${d} p.p.` : ""}`}</p>
            </div>
          </div>
        );
      })}
      <p className="mt-0.5 flex items-center text-[11px] font-semibold text-brand-purple-dark/45">
        <span aria-hidden className="mr-2 inline-block h-3 w-[3px] rounded-xs bg-brand-purple-dark/45" />
        {`Marcação: avaliação de ${app.previousAt}.`}
      </p>
    </div>
  );
}

/** Pontuação por domínio com evolução (`VbDomainTable`), sobre o `Table` do catálogo. Novo — não existe no Phoenix. */
export function VbDomainTable({ app }: { app: ProtocolApplication }) {
  const rows = vbDomainRows(app.cells, app.previous).filter((r) => r.max > 0);
  type Row = (typeof rows)[number];
  return (
    <Table<Row>
      id={`vbmapp-dominios-${app.id}`}
      rows={rows}
      rowId={(r) => `vbmapp-dominio-${r.id}`}
      col={[
        { label: "Domínio", render: (r) => r.name },
        { label: "Pontuação", className: "whitespace-nowrap", render: (r) => `${vbNum(r.score)}/${r.max}` },
        {
          label: "Aproveitamento",
          className: "whitespace-nowrap",
          render: (r) => (
            <>
              <span className="inline-block h-1.5 w-[90px] overflow-hidden rounded-full bg-brand-purple-dark/8 align-middle">
                <span className="block h-full rounded-full bg-brand-blue" style={{ width: `${r.pct}%` }} />
              </span>
              <span className="ml-2 text-xs font-bold text-brand-purple-dark/60">{`${r.pct}%`}</span>
            </>
          ),
        },
        {
          label: `Desde ${app.previousAt || "a última"}`,
          className: "whitespace-nowrap",
          render: (r) =>
            r.delta > 0 ? (
              <span className="inline-flex items-center gap-1.5 text-xs font-extrabold text-green-dark">
                <Icon name="fa-arrow-up" type="solid" />
                {`+${vbNum(r.delta)}`}
              </span>
            ) : r.delta < 0 ? (
              <span className="inline-flex items-center gap-1.5 text-xs font-extrabold text-red-dark">
                <Icon name="fa-arrow-down" type="solid" />
                {vbNum(r.delta)}
              </span>
            ) : (
              <span className="text-xs font-semibold text-brand-purple-dark/40">sem mudança</span>
            ),
        },
      ]}
    />
  );
}
