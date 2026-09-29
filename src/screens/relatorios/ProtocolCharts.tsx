/**
 * Relatório de Protocolo — gráficos do VB-MAPP (`relatorios-protocolo.jsx` e
 * `RfVbLevelBars` de `relatorios-foco.jsx`). Novo — não existe no Phoenix:
 * desenhados em HTML/CSS com tokens do monólito. Os números vêm de
 * `vbDomainRows`, `vbLevelTotals` e `vbTotal` (`model.ts`).
 *
 * Exportado (todos recebem `app: ProtocolApplication`):
 * - `ProtocolSource`: faixa da aplicação de origem com o aproveitamento total.
 * - `VbMilestoneGrid`: grade de marcos (16 domínios × 3 níveis) com legenda.
 * - `VbLevelBars`: aproveitamento por nível em barras horizontais, com a marca
 *   da avaliação anterior (a versão da v2; a `VbLevelChart` vertical é da v1).
 * - `VbDomainTable`: pontuação por domínio e variação desde a anterior, sobre o
 *   `Table` do catálogo.
 * - `VbBlock`: bloco com título em caixa alta (`vb-block`).
 */
import type { ReactNode } from "react";
import { Icon } from "../../components/Icon.js";
import { Table } from "../../components/Table.js";
import { VB_LEVELS, vbDomainRows, vbLevelTotals, vbTone, vbTotal, type ProtocolApplication, type VbTone } from "./model.js";

const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(" ");

/** Hachura de "não avaliado", com o `neutral-50` do monólito. */
const HATCH = "bg-[repeating-linear-gradient(135deg,var(--color-neutral-50)_0_4px,transparent_4px_8px)]";

const TONE_BG: Record<VbTone, string> = {
  off: HATCH,
  t0: "bg-red/10",
  t1: "bg-orange/20",
  t3: "bg-yellow/25",
  t4: "bg-brand-green/25",
  t5: "bg-brand-green/40",
};

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
        <span className="text-xs font-bold text-brand-purple-dark/55">{`${tot.score} de ${tot.max} marcos`}</span>
      </div>
    </div>
  );
}

const LEGEND: [VbTone, string][] = [
  ["t0", "0 marcos"],
  ["t1", "1–2"],
  ["t3", "3"],
  ["t4", "4"],
  ["t5", "5 — nível completo"],
  ["off", "não avaliado"],
];

/** Grade de marcos por nível (`VbMilestoneGrid`). Novo — não existe no Phoenix. */
export function VbMilestoneGrid({ app }: { app: ProtocolApplication }) {
  const rows = vbDomainRows(app.cells, app.previous);
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-separate border-spacing-[3px]">
        <thead>
          <tr className="[&>th]:p-1 [&>th]:text-center [&>th]:text-[11px] [&>th]:font-extrabold [&>th]:text-brand-purple-dark/60">
            <th className="min-w-50 text-left!">Domínio</th>
            {VB_LEVELS.map((l) => (
              <th key={l.id}>
                {l.label}
                <span className="block text-[9px] font-bold text-brand-purple-dark/40">{l.sub}</span>
              </th>
            ))}
            <th>Total</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id}>
              <th scope="row" className="py-1 pr-2 text-left text-xs font-bold whitespace-nowrap text-brand-purple-dark">
                {r.name}
              </th>
              {VB_LEVELS.map((l, i) => {
                const v = r.row[i];
                return (
                  <td
                    key={l.id}
                    title={v == null ? "Não avaliado neste nível" : `${v} de 5 marcos`}
                    className={cx("h-[34px] w-[74px] rounded-lg text-center", TONE_BG[vbTone(v)])}
                  >
                    {v == null ? (
                      <span className="text-xs text-brand-purple-dark/25">—</span>
                    ) : (
                      <span className="text-[13px] font-extrabold text-brand-purple-dark">
                        {v}
                        <span className="text-[10px] font-bold opacity-55">/5</span>
                      </span>
                    )}
                  </td>
                );
              })}
              <td className="text-center text-xs font-extrabold whitespace-nowrap text-brand-purple-dark/60">{r.max ? `${r.score}/${r.max}` : "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="mt-3 flex flex-wrap gap-3.5">
        {LEGEND.map(([tone, label]) => (
          <span key={tone} className="inline-flex items-center gap-1.5 text-[11px] font-bold text-brand-purple-dark/55">
            <i className={cx("h-3.5 w-3.5 rounded", tone === "off" ? "bg-[repeating-linear-gradient(135deg,var(--color-neutral-100)_0_4px,transparent_4px_8px)]" : TONE_BG[tone])} />
            {label}
          </span>
        ))}
      </div>
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
              <p className="mt-px text-xs text-brand-purple-dark/55">{`${t.score} de ${t.max}${d !== 0 ? ` · ${d > 0 ? "+" : ""}${d} p.p.` : ""}`}</p>
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
        { label: "Pontuação", className: "whitespace-nowrap", render: (r) => `${r.score}/${r.max}` },
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
                {`+${r.delta}`}
              </span>
            ) : r.delta < 0 ? (
              <span className="inline-flex items-center gap-1.5 text-xs font-extrabold text-red-dark">
                <Icon name="fa-arrow-down" type="solid" />
                {r.delta}
              </span>
            ) : (
              <span className="text-xs font-semibold text-brand-purple-dark/40">sem mudança</span>
            ),
        },
      ]}
    />
  );
}
