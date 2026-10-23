/**
 * Panorama de vagas, versão visual.
 *
 * Componente novo (não existe no Phoenix). Mesmas contas das outras versões
 * (`panoramaModel.ts`), contadas em gráficos:
 * 1. a linha de filtros (as fontes da demanda), acima de tudo o que ela afeta;
 * 2. três números: falta contratar (o destaque), horas livres e demanda;
 * 3. falta × sobra por especialidade, em barras divergentes (clicar escolhe a
 *    especialidade do mapa de baixo);
 * 4. como cada fonte da demanda é atendida: barras empilhadas atendida × falta;
 * 5. a semana da especialidade escolhida num mapa de calor divergente (falta
 *    em vermelho, horas livres em azul); clicar num horário abre o detalhe.
 *
 * Duas cores só, o azul e o vermelho da marca: `brand-blue` (#58BADA) para
 * atendida/livre e `brand-red` (#FF445D) para falta. O par passa no validador
 * de paleta do guia de visualização (separação para daltonismo inclusive); o
 * azul fica abaixo de 3:1 de contraste com o fundo, então todo valor também
 * aparece em texto (nas pontas das barras e na tabela "Ver os números"), além
 * do tooltip. O resto é texto e cinza.
 */
import { useState, type PointerEvent, type ReactNode } from "react";
import { Input, InputSwitchCard } from "../../components/Input.js";
import type { LeadStatus, Specialty, UnitMapData } from "./fixtures.js";
import { field } from "./flow.js";
import { CALENDAR_WEEKDAYS, openWeekdays, unitHours } from "./model.js";
import { CellModal } from "./Panorama.js";
import { FTE, LEAD_STAGES, composition, panoramaModel, slotOf, type DemandType, type Slot, type SpecialtyModel } from "./panoramaModel.js";
import { ORDERED_SPECIALTIES, SPECIALTIES } from "./UnitHeatMap.js";

const cx = (...classes: (string | false | null | undefined)[]) => classes.filter(Boolean).join(" ");

const MET = "var(--color-brand-blue)";
const GAP = "var(--color-brand-red)";
/** Um passo do mapa de calor: a cor da ponta misturada ao branco. */
const step = (color: string, pct: number) => `color-mix(in oklab, ${color} ${pct}%, white)`;

const hh = (h: number) => `${String(h).padStart(2, "0")}h`;
const fte = (h: number) => (h / FTE).toFixed(1).replace(".", ",");

/* ============================================================
   Tooltip
   ============================================================ */

type Tip = { x: number; y: number; title: string; rows: { label: string; value: string; color?: string }[] } | null;

function Tooltip({ tip }: { tip: Tip }) {
  if (!tip) return null;
  return (
    <div
      role="tooltip"
      className="pointer-events-none fixed z-50 min-w-40 rounded-lg bg-white px-3 py-2 shadow-main ring-1 ring-brand-purple-dark/10"
      style={{ left: tip.x + 14, top: tip.y + 14 }}
    >
      <p className="m-0 mb-1 text-xs text-brand-purple-dark/60">{tip.title}</p>
      {tip.rows.map((r) => (
        <p key={r.label} className="m-0 flex items-center gap-2 text-xs text-brand-purple-dark/70">
          {r.color && <span className="h-0.5 w-3 rounded-full" style={{ background: r.color }}></span>}
          <b className="text-sm font-bold text-brand-purple-dark">{r.value}</b>
          {r.label}
        </p>
      ))}
    </div>
  );
}

function useTip() {
  const [tip, setTip] = useState<Tip>(null);
  const bind = (content: Omit<NonNullable<Tip>, "x" | "y">) => ({
    onPointerMove: (e: PointerEvent) => setTip({ ...content, x: e.clientX, y: e.clientY }),
    onPointerLeave: () => setTip(null),
    onBlur: () => setTip(null),
    onFocus: (e: { currentTarget: Element }) => {
      const r = e.currentTarget.getBoundingClientRect();
      setTip({ ...content, x: r.right, y: r.top });
    },
  });
  return { tip, bind };
}

/* ============================================================
   Peças
   ============================================================ */

function SourceToggle({ name, label, on, onChange }: { name: string; label: string; on: boolean; onChange: (on: boolean) => void }) {
  const f = field(name, on, "panorama");
  return (
    <InputSwitchCard label={label} active={f}>
      <Input type="switch" field={f} onChange={(event) => onChange(event.target.checked)} />
    </InputSwitchCard>
  );
}

function ChartCard({ title, subtitle, legend, children }: { title: string; subtitle?: string; legend?: ReactNode; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-4 rounded-xl border border-brand-purple-dark/10 bg-white p-5 min-w-0">
      <header className="flex flex-wrap items-start justify-between gap-x-6 gap-y-2">
        <div>
          <h3 className="m-0 text-base font-extrabold text-brand-purple-dark">{title}</h3>
          {subtitle && <p className="m-0 mt-0.5 text-xs text-brand-purple-dark/60">{subtitle}</p>}
        </div>
        {legend}
      </header>
      {children}
    </section>
  );
}

function LegendItem({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-brand-purple-dark/70">
      <span className="h-2.5 w-2.5 rounded-sm" style={{ background: color }}></span>
      {label}
    </span>
  );
}

function StatTile({ label, value, note, accent }: { label: string; value: string; note?: string; accent?: string }) {
  return (
    <div className="flex flex-col gap-1 rounded-xl border border-brand-purple-dark/10 bg-white px-5 py-4">
      <p className="m-0 flex items-center gap-2 text-sm text-brand-purple-dark/70">
        {accent && <span className="h-2.5 w-2.5 rounded-sm" style={{ background: accent }}></span>}
        {label}
      </p>
      <p className="m-0 text-[40px] font-bold leading-tight text-brand-purple-dark">{value}</p>
      {note && <p className="m-0 text-xs text-brand-purple-dark/60">{note}</p>}
    </div>
  );
}

/* ============================================================
   Falta × sobra por especialidade (barras divergentes)
   ============================================================ */

function GapSurplusBars({
  rows,
  m,
  selected,
  onSelect,
  bind,
}: {
  rows: Specialty[];
  m: Record<Specialty, SpecialtyModel>;
  selected: Specialty;
  onSelect: (s: Specialty) => void;
  bind: ReturnType<typeof useTip>["bind"];
}) {
  const max = Math.max(1, ...rows.map((s) => Math.max(m[s].need, m[s].surplus)));
  return (
    <div className="flex flex-col">
      <div className="grid grid-cols-[120px_1fr_1fr] pb-2 text-xs text-brand-purple-dark/50">
        <span></span>
        <span className="pr-2 text-right">← Falta</span>
        <span className="pl-2">Sobra →</span>
      </div>
      {rows.map((s) => {
        const x = m[s];
        const on = s === selected;
        return (
          <button
            key={s}
            type="button"
            onClick={() => onSelect(s)}
            aria-pressed={on}
            {...bind({
              title: SPECIALTIES[s].name,
              rows: [
                { label: "faltam", value: `${x.need}h`, color: GAP },
                { label: "livres sem procura", value: `${x.surplus}h`, color: MET },
              ],
            })}
            className={cx(
              "grid grid-cols-[120px_1fr_1fr] items-center h-9 rounded-md text-left cursor-pointer",
              on ? "bg-brand-purple-dark/[0.05]" : "hover:bg-brand-purple-dark/[0.03]",
            )}
          >
            <span className={cx("truncate pl-2 text-sm", on ? "font-bold text-brand-purple-dark" : "text-brand-purple-dark/80")}>
              {SPECIALTIES[s].name}
            </span>
            <span className="flex h-full items-center justify-end gap-1.5 border-r border-brand-purple-dark/20 pr-0.5">
              {x.need > 0 && <span className="text-xs font-bold text-brand-purple-dark">{`${x.need}h`}</span>}
              <span className="h-4 rounded-l" style={{ width: `${(x.need / max) * 85}%`, background: GAP }}></span>
            </span>
            <span className="flex h-full items-center gap-1.5 pl-0.5">
              <span className="h-4 rounded-r" style={{ width: `${(x.surplus / max) * 85}%`, background: MET }}></span>
              {x.surplus > 0 && <span className="text-xs text-brand-purple-dark/60">{`${x.surplus}h`}</span>}
            </span>
          </button>
        );
      })}
    </div>
  );
}

/* ============================================================
   Como cada fonte é atendida (barras empilhadas)
   ============================================================ */

function SourceBars({ sources, bind }: { sources: { label: string; met: number; gap: number }[]; bind: ReturnType<typeof useTip>["bind"] }) {
  const max = Math.max(1, ...sources.map((s) => s.met + s.gap));
  return (
    <div className="flex flex-col gap-4">
      {sources.map((s) => {
        const total = s.met + s.gap;
        return (
          <div
            key={s.label}
            tabIndex={0}
            className="flex flex-col gap-1.5 rounded-md outline-none focus-visible:ring-2 focus-visible:ring-brand-blue"
            {...bind({
              title: s.label,
              rows: [
                { label: "atendidas pela equipe", value: `${s.met}h`, color: MET },
                { label: "sem profissional", value: `${s.gap}h`, color: GAP },
              ],
            })}
          >
            <div className="flex items-baseline justify-between gap-3">
              <span className="text-sm text-brand-purple-dark">{s.label}</span>
              <span className="text-xs text-brand-purple-dark/60">
                {total === 0 ? "nenhuma hora" : `${total}h · `}
                {s.gap > 0 && <b className="font-bold text-brand-purple-dark">{`faltam ${s.gap}h`}</b>}
                {total > 0 && s.gap === 0 && "tudo atendido"}
              </span>
            </div>
            <div className="flex h-4 gap-0.5" style={{ width: `${Math.max(2, (total / max) * 100)}%` }}>
              {s.met > 0 && <span className="h-full rounded-l first:rounded-l last:rounded-r" style={{ flexGrow: s.met, background: MET }}></span>}
              {s.gap > 0 && <span className="h-full rounded-r first:rounded-l" style={{ flexGrow: s.gap, background: GAP }}></span>}
              {total === 0 && <span className="h-full w-full rounded bg-brand-purple-dark/10"></span>}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ============================================================
   Semana da especialidade (mapa de calor divergente)
   ============================================================ */

function WeekHeatmap({
  data,
  x,
  name,
  useLeads,
  onCell,
  bind,
}: {
  data: UnitMapData;
  x: SpecialtyModel;
  name: string;
  useLeads: boolean;
  onCell: (y: Slot) => void;
  bind: ReturnType<typeof useTip>["bind"];
}) {
  const hours = unitHours(data);
  const weekdays = openWeekdays(data);
  const cells = weekdays.flatMap((d) => hours.map((h) => slotOf(x, d, h)));
  const gapOf = (y: Slot) => y.gap + (useLeads ? y.leadsOut.length : 0);
  // Uma escala para cada lado: a maior falta da semana sai no vermelho da marca puro (#FF445D).
  const maxGap = Math.max(1, ...cells.map(gapOf));
  const maxLeft = Math.max(1, ...cells.map((y) => y.left));
  const fill = (y: Slot) => {
    const g = gapOf(y);
    if (g > 0) return step(GAP, 55 + (45 * g) / maxGap);
    if (y.left > 0) return step(MET, 12 + (48 * y.left) / maxLeft);
    return "var(--color-neutral-50)";
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="overflow-x-auto">
        <div className="grid gap-0.5" style={{ gridTemplateColumns: `88px repeat(${hours.length}, minmax(44px, 1fr))`, minWidth: 88 + hours.length * 46 }}>
          <span></span>
          {hours.map((h) => (
            <span key={h} className="pb-1 text-center text-xs text-brand-purple-dark/50 tabular-nums">
              {hh(h)}
            </span>
          ))}
          {weekdays.map((d) => [
            <span key={`d${d}`} className="flex items-center text-sm text-brand-purple-dark/80">
              {CALENDAR_WEEKDAYS[d - 1]!.split("-")[0]}
            </span>,
            ...hours.map((h) => {
              const y = slotOf(x, d, h);
              const g = gapOf(y);
              const empty = g === 0 && y.left === 0 && y.dem.length === 0;
              return (
                <button
                  key={`${d}-${h}`}
                  type="button"
                  disabled={empty}
                  onClick={() => onCell(y)}
                  {...bind({
                    title: `${name} · ${CALENDAR_WEEKDAYS[d - 1]}, ${hh(h)}`,
                    rows: [
                      { label: "faltam", value: `${g}h`, color: GAP },
                      { label: "livres", value: `${y.left}h`, color: MET },
                      { label: "na demanda", value: `${y.dem.length + (useLeads ? y.leadsIn.length + y.leadsOut.length : 0)}h` },
                    ],
                  })}
                  className="h-9 rounded text-xs font-bold tabular-nums enabled:cursor-pointer enabled:hover:ring-2 enabled:hover:ring-brand-purple-dark/30 disabled:cursor-default"
                  style={{ background: fill(y), color: g > 0 ? "white" : "transparent" }}
                >
                  {g > 0 ? g : ""}
                </button>
              );
            }),
          ])}
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-brand-purple-dark/70">
        <span className="inline-flex items-center gap-1.5">
          <span className="flex gap-0.5">
            {[55, 78, 100].map((p) => (
              <span key={p} className="h-2.5 w-4 rounded-sm" style={{ background: step(GAP, p) }}></span>
            ))}
          </span>
          Falta (mais escuro, mais horas; o número é quantas)
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="flex gap-0.5">
            {[20, 40, 60].map((p) => (
              <span key={p} className="h-2.5 w-4 rounded-sm" style={{ background: step(MET, p) }}></span>
            ))}
          </span>
          Horas livres
        </span>
        <span className="text-brand-purple-dark/50">Clique num horário para ver quem é.</span>
      </div>
    </div>
  );
}

/* ============================================================
   Página
   ============================================================ */

export function PanoramaVisual({ data }: { data: UnitMapData }) {
  const [types, setTypes] = useState<DemandType[]>(["inc", "tbd"]);
  const [useLeads, setUseLeads] = useState(true);
  const [includeTbd, setIncludeTbd] = useState(true);
  const [fromStage, setFromStage] = useState<LeadStatus>("avaliacao");
  const [selected, setSelected] = useState<Specialty | null>(null);
  const [cell, setCell] = useState<Slot | null>(null);
  const [showTable, setShowTable] = useState(false);
  const { tip, bind } = useTip();
  const toggleType = (t: DemandType, on: boolean) => setTypes((ts) => (on ? [...ts.filter((x) => x !== t), t] : ts.filter((x) => x !== t)));

  const m = panoramaModel(data, ORDERED_SPECIALTIES, { includeTbd, types, useLeads, fromStage });
  const tbdHours = Object.values(composition(data, includeTbd).tbdProfBy).reduce((a, b) => a + (b ?? 0), 0);
  const demandOf = (s: Specialty) => m[s].demand + (useLeads ? m[s].leadNeed : 0);
  const rows = ORDERED_SPECIALTIES.filter((s) => m[s].offer || demandOf(s)).sort(
    (a, b) => m[b].need - m[a].need || m[b].surplus - m[a].surplus,
  );
  const total = (k: keyof SpecialtyModel) => rows.reduce((n, s) => n + (m[s][k] as number), 0);
  const need = total("need");
  const offer = total("offer");
  const demand = rows.reduce((n, s) => n + demandOf(s), 0);
  const sid = selected && rows.includes(selected) ? selected : rows[0];

  const sources = [
    types.includes("inc") && { label: "Pacientes sem profissional", met: total("coverInc"), gap: total("gapInc") },
    types.includes("tbd") && { label: "Sessões em vaga TBD", met: total("coverTbd"), gap: total("gapTbd") },
    useLeads && { label: "Leads", met: total("leadFit"), gap: total("leadOut") + total("leadNoWin") },
  ].filter(Boolean) as { label: string; met: number; gap: number }[];

  return (
    <div className="flex flex-col gap-5">
      <section className="flex flex-wrap items-center gap-3">
        <span className="text-sm font-bold text-brand-purple-dark/70">Contar na demanda:</span>
        <SourceToggle name="consider_inc" label="Pacientes sem profissional" on={types.includes("inc")} onChange={(on) => toggleType("inc", on)} />
        <SourceToggle name="consider_tbd" label="Sessões em vaga TBD" on={types.includes("tbd")} onChange={(on) => toggleType("tbd", on)} />
        <SourceToggle name="consider_leads" label="Leads" on={useLeads} onChange={setUseLeads} />
        {useLeads && (
          <span className="inline-flex items-center gap-2">
            <span className="text-sm text-brand-purple-dark/70 whitespace-nowrap">a partir de</span>
            <Input
              type="select"
              field={field("from_stage", fromStage, "panorama")}
              options={LEAD_STAGES.map((s) => [s.label, s.id] as const)}
              className="min-w-[200px]"
              onChange={(value) => value && setFromStage(value as LeadStatus)}
            />
          </span>
        )}
        <span className="mx-1 h-6 w-px bg-brand-purple-dark/10" aria-hidden="true"></span>
        <SourceToggle name="include_tbd" label={`Vagas TBD nas horas livres (${tbdHours}h)`} on={includeTbd} onChange={setIncludeTbd} />
      </section>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatTile
          label="Falta contratar"
          value={`${need}h`}
          note={need > 0 ? `por semana · cerca de ${fte(need)} profissional de ${FTE}h` : "a equipe cobre toda a demanda"}
          accent={GAP}
        />
        <StatTile label="Horas livres da equipe" value={`${offer}h`} note="na agenda padrão, por semana" accent={MET} />
        <StatTile label="Demanda da semana" value={`${demand}h`} note={`${demand - need}h já cabem na equipe`} />
      </div>

      {rows.length === 0 ? (
        <p className="text-center py-8 text-neutral-600">Nenhuma hora livre nem demanda na unidade para a semana.</p>
      ) : (
        <>
          <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] gap-4">
            <ChartCard
              title="Falta e sobra por especialidade"
              subtitle="Horas por semana. Clique numa especialidade para ver a semana dela."
              legend={
                <span className="flex gap-4">
                  <LegendItem color={GAP} label="Falta" />
                  <LegendItem color={MET} label="Livre sem procura" />
                </span>
              }
            >
              <GapSurplusBars rows={rows} m={m} selected={sid!} onSelect={setSelected} bind={bind} />
            </ChartCard>

            <ChartCard
              title="Como a demanda é atendida"
              subtitle="Horas por fonte da demanda."
              legend={
                <span className="flex gap-4">
                  <LegendItem color={MET} label="Atendida" />
                  <LegendItem color={GAP} label="Sem profissional" />
                </span>
              }
            >
              {sources.length > 0 ? <SourceBars sources={sources} bind={bind} /> : <p className="m-0 text-sm text-brand-purple-dark/60">Nenhuma fonte ligada nos filtros.</p>}
            </ChartCard>
          </div>

          <ChartCard
            title={`Semana de ${SPECIALTIES[sid!].name}`}
            subtitle={
              m[sid!].need > 0
                ? `Faltam ${m[sid!].need}h por semana (cerca de ${fte(m[sid!].need)} profissional de ${FTE}h).`
                : `A equipe cobre toda a demanda${m[sid!].surplus ? ` e sobram ${m[sid!].surplus}h livres` : ""}.`
            }
          >
            <WeekHeatmap data={data} x={m[sid!]} name={SPECIALTIES[sid!].name} useLeads={useLeads} onCell={setCell} bind={bind} />
          </ChartCard>

          <div>
            <button type="button" onClick={() => setShowTable((v) => !v)} className="text-sm font-bold text-brand-blue-dark cursor-pointer" aria-expanded={showTable}>
              {showTable ? "Esconder os números" : "Ver os números em tabela"}
            </button>
            {showTable && (
              <div className="mt-3 overflow-x-auto rounded-lg border border-brand-purple-dark/10 bg-white">
                <table className="w-full border-separate border-spacing-0 text-sm [&_td]:border-b [&_td]:border-brand-purple-dark/10 [&_th]:border-b [&_th]:border-brand-purple-dark/10 [&_tbody>tr:last-child>td]:border-b-0">
                  <thead>
                    <tr className="text-left text-xs uppercase tracking-wide text-brand-purple-dark/60">
                      <th className="px-4 py-2.5 font-bold">Especialidade</th>
                      <th className="px-4 py-2.5 font-bold text-right">Horas livres</th>
                      <th className="px-4 py-2.5 font-bold text-right">Demanda</th>
                      <th className="px-4 py-2.5 font-bold text-right">Falta</th>
                      <th className="px-4 py-2.5 font-bold text-right">Sobra</th>
                    </tr>
                  </thead>
                  <tbody className="tabular-nums text-brand-purple-dark">
                    {rows.map((s) => (
                      <tr key={s}>
                        <td className="px-4 py-2.5">{SPECIALTIES[s].name}</td>
                        <td className="px-4 py-2.5 text-right">{`${m[s].offer}h`}</td>
                        <td className="px-4 py-2.5 text-right">{`${demandOf(s)}h`}</td>
                        <td className="px-4 py-2.5 text-right font-bold">{m[s].need ? `${m[s].need}h` : "–"}</td>
                        <td className="px-4 py-2.5 text-right">{m[s].surplus ? `${m[s].surplus}h` : "–"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      <Tooltip tip={tip} />
      {cell && sid && <CellModal specialty={sid} y={cell} useLeads={useLeads} onClose={() => setCell(null)} />}
    </div>
  );
}
