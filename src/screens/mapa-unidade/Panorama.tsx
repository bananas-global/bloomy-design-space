/**
 * Panorama de vagas — o plano de contratação da unidade.
 *
 * Componente novo: não existe no Phoenix. Vem do protótipo do Claude Design
 * ("Mapa da Unidade", `mapa-unidade-panorama-v2.jsx`), com o markup portado
 * para Tailwind e as cores trocadas pelos tokens do monólito. Lê de cima para
 * baixo: composição da semana (as fontes que entram na conta) → balanço →
 * especialidades ordenadas pelo que falta → vaga sugerida e semana por
 * horário da especialidade escolhida.
 */
import { useState, type ReactNode } from "react";
import { Icon } from "../../components/Icon.js";
import { Input } from "../../components/Input.js";
import { Avatar } from "../../components/Layout.js";
import { Modal } from "../../components/Overlay.js";
import type { LeadStatus, Specialty, UnitMapData } from "./fixtures.js";
import { field } from "./flow.js";
import { CALENDAR_WEEKDAYS, SHORT_WEEKDAYS, openWeekdays, unitHours } from "./model.js";
import {
  DEMAND_TYPES,
  FTE,
  LEAD_STAGES,
  activeLeads,
  composition,
  isFromStage,
  panoramaModel,
  slotOf,
  type DemandType,
  type Slot,
  type SpecialtyModel,
} from "./panoramaModel.js";
import { ORDERED_SPECIALTIES, SPECIALTIES } from "./UnitHeatMap.js";

const cx = (...classes: (string | false | null | undefined)[]) => classes.filter(Boolean).join(" ");

/** A cor de cada especialidade, a mesma do mapa de calor (`specialties/0`). */
const DOT: Record<Specialty, string> = {
  psychology: "bg-brand-blue",
  psychopedagogy: "bg-brand-orange",
  phonoaudiology: "bg-brand-accent",
  physiotherapy: "bg-brand-green",
  psychomotricity: "bg-brand-info",
  music_therapy: "bg-warning",
  occupational_therapy: "bg-brand-red",
  nutritionist: "bg-fuchsia",
};

const STRIPES = "bg-[repeating-linear-gradient(45deg,var(--color-brand-red)_0_4px,var(--color-red-light)_4px_8px)]";

const hh = (h: number) => `${String(h).padStart(2, "0")}h`;
const fte = (h: number) => (h / FTE).toFixed(1).replace(".", ",");
const pl = (n: number, a: string, b: string) => `${n} ${n === 1 ? a : b}`;
const sum = (o: Partial<Record<string, number>>) => Object.values(o).reduce<number>((a, b) => a + (b ?? 0), 0);

function Dot({ specialty, className = "w-2.5 h-2.5 mr-2" }: { specialty: Specialty; className?: string }) {
  return <span className={cx("inline-block shrink-0 rounded-full", DOT[specialty], className)}></span>;
}

const Kicker = ({ children, className }: { children: ReactNode; className?: string }) => (
  <p className={cx("m-0 text-xs font-black uppercase tracking-wide text-brand-purple-dark/60", className)}>{children}</p>
);

/**
 * A chave que liga ou desliga a fonte inteira (o cartão todo entra ou sai da
 * conta): só o `input type="switch"`, sem rótulo visível. A margem negativa
 * compensa a altura do switch (`h-12`) para o cabeçalho do cartão não crescer.
 */
function SourceSwitch({ name, on, label, onChange }: { name: string; on: boolean; label: string; onChange: (on: boolean) => void }) {
  return (
    <div className="shrink-0 -my-3" title={label}>
      <Input type="switch" field={field(name, on, "panorama")} aria-label={label} onChange={(event) => onChange(event.target.checked)} />
    </div>
  );
}

/* ============================================================
   Composição da semana
   ============================================================ */

function SourceCard({
  title,
  icon,
  total,
  sub,
  off,
  toggle,
  children,
}: {
  title: string;
  icon: string;
  total: number;
  sub: ReactNode;
  off?: boolean;
  toggle?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className={cx("flex flex-col gap-1.5 p-4 border border-neutral-100 rounded-xl min-w-0", off ? "bg-brand-purple-dark/[0.02]" : "bg-white")}>
      <div className="flex items-center justify-between gap-2">
        <span className="inline-flex items-center gap-2 text-[13px] font-extrabold text-brand-purple-dark">
          <Icon type="solid" name={icon} className="text-xs text-brand-blue-dark" />
          {title}
        </span>
        {toggle}
      </div>
      <div className={cx("flex flex-col gap-1.5", off && "opacity-45")}>
        <b className="text-[26px] font-black leading-tight text-brand-purple-dark">{`${total}h`}</b>
        {typeof sub === "string" ? <span className="text-xs text-brand-purple-dark/60 -mt-1">{sub}</span> : sub}
        {children}
      </div>
    </div>
  );
}

function SpecialtyBreak({ values }: { values: Partial<Record<Specialty, number>> }) {
  const list = ORDERED_SPECIALTIES.map((s) => ({ s, v: values[s] ?? 0 }))
    .filter((x) => x.v > 0)
    .sort((a, b) => b.v - a.v);
  if (list.length === 0) return <p className="mt-1 mb-0 text-[12.5px] text-brand-purple-dark/50">Nenhuma hora.</p>;
  return (
    <>
      <span className="flex gap-0.5 h-2 mt-1">
        {list.map(({ s, v }) => (
          <i key={s} className={cx("block rounded-sm min-w-[3px]", DOT[s])} style={{ flexGrow: v }} title={`${SPECIALTIES[s].name}: ${v}h`}></i>
        ))}
      </span>
      <ul className="list-none mt-1 mb-0 p-0 flex flex-col gap-0.5">
        {list.map(({ s, v }) => (
          <li key={s} className="flex items-center justify-between gap-2 text-[12.5px] text-brand-purple-dark/75">
            <span className="flex items-center min-w-0 truncate">
              <Dot specialty={s} className="w-2 h-2 mr-1.5" />
              {SPECIALTIES[s].name}
            </span>
            <b className="font-extrabold text-brand-purple-dark">{`${v}h`}</b>
          </li>
        ))}
      </ul>
    </>
  );
}

function Compose({
  data,
  includeTbd,
  setIncludeTbd,
  types,
  toggleType,
  useLeads,
  setUseLeads,
  fromStage,
}: {
  data: UnitMapData;
  includeTbd: boolean;
  setIncludeTbd: (v: boolean) => void;
  types: DemandType[];
  toggleType: (t: DemandType) => void;
  useLeads: boolean;
  setUseLeads: (v: boolean) => void;
  fromStage: LeadStatus;
}) {
  const c = composition(data, includeTbd);
  const tbdProfH = sum(c.tbdProfBy);
  const rows = c.stageRows.map((r) => ({ ...r, on: useLeads && isFromStage(r.stage.id, fromStage) }));
  const leadTotal = rows.filter((r) => r.on).reduce((n, r) => n + r.total, 0);
  const leadMax = Math.max(1, ...rows.map((r) => r.total));
  const stageLabel = LEAD_STAGES.find((s) => s.id === fromStage)?.label;

  return (
    <section className="flex flex-col gap-2.5">
      <div className="flex items-baseline justify-between gap-x-4 gap-y-2 flex-wrap">
        <Kicker>Composição da semana</Kicker>
        <span className="text-[12.5px] text-brand-purple-dark/55">Ligue ou desligue cada fonte para recalcular o balanço abaixo</span>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 2xl:grid-cols-[repeat(3,minmax(0,1fr))_minmax(0,1.35fr)] gap-2.5 items-stretch">
        <SourceCard
          title="Carga horária disponível"
          icon="fa-user-doctor"
          total={sum(c.offerBy)}
          sub={
            // Não desliga o cartão: só decide se as horas das vagas TBD entram na carga, então é uma caixa de seleção no corpo.
            <Input
              type="checkbox"
              field={field("include_tbd", includeTbd, "panorama")}
              label={`Incluir as ${tbdProfH}h de vagas TBD (ainda não contratadas)`}
              className="-mt-1 [&_label]:w-full [&_label]:py-2 [&_label]:px-3 [&_label]:text-xs [&_label]:gap-2"
              onChange={(event) => setIncludeTbd(event.target.checked)}
            />
          }
        >
          <SpecialtyBreak values={c.offerBy} />
        </SourceCard>
        <SourceCard
          title="Demanda dos Incompletos"
          icon="fa-user-slash"
          total={sum(c.incBy)}
          sub="agendamentos sem profissional"
          off={!types.includes("inc")}
          toggle={<SourceSwitch name="consider_inc" on={types.includes("inc")} label="Considerar" onChange={() => toggleType("inc")} />}
        >
          <SpecialtyBreak values={c.incBy} />
        </SourceCard>
        <SourceCard
          title="Carga definida por TBD"
          icon="fa-user-clock"
          total={sum(c.tbdBy)}
          sub="sessões agendadas em vagas não contratadas"
          off={!types.includes("tbd")}
          toggle={<SourceSwitch name="consider_tbd" on={types.includes("tbd")} label="Considerar" onChange={() => toggleType("tbd")} />}
        >
          <SpecialtyBreak values={c.tbdBy} />
        </SourceCard>
        <SourceCard
          title="Demanda dos leads"
          icon="fa-user-plus"
          total={leadTotal}
          sub={useLeads ? `etapas a partir de ${stageLabel}` : "fora do cálculo"}
          off={!useLeads}
          toggle={<SourceSwitch name="consider_leads" on={useLeads} label="Considerar" onChange={setUseLeads} />}
        >
          <div className="flex flex-col gap-1.5 mt-1">
            {rows.map((r) => {
              const list = ORDERED_SPECIALTIES.filter((s) => r.by[s]);
              return (
                <div
                  key={r.stage.id}
                  className={cx("grid grid-cols-[minmax(0,138px)_minmax(0,1fr)_38px] items-center gap-2", !r.on && "opacity-40")}
                  title={list.map((s) => `${SPECIALTIES[s].name}: ${r.by[s]}h`).join(" · ")}
                >
                  <span className="flex flex-col text-xs font-bold text-brand-purple-dark leading-tight min-w-0">
                    {r.stage.label}
                    <em className="not-italic text-[11px] font-semibold text-brand-purple-dark/55">{`${r.n} lead${r.n === 1 ? "" : "s"}`}</em>
                  </span>
                  <span className="flex min-w-0">
                    <span className="flex gap-0.5 h-2.5 min-w-[3px]" style={{ width: `${(r.total / leadMax) * 100}%` }}>
                      {list.map((s) => (
                        <i key={s} className={cx("block rounded-sm min-w-[3px]", DOT[s])} style={{ flexGrow: r.by[s] }}></i>
                      ))}
                    </span>
                  </span>
                  <b className="text-[12.5px] font-extrabold text-right text-brand-purple-dark">{r.total ? `${r.total}h` : "—"}</b>
                </div>
              );
            })}
          </div>
          <p className="mt-1.5 mb-0 flex gap-x-3 gap-y-1 flex-wrap">
            {ORDERED_SPECIALTIES.filter((s) => rows.some((r) => r.by[s])).map((s) => (
              <span key={s} className="inline-flex items-center text-[11.5px] font-bold text-brand-purple-dark/70">
                <Dot specialty={s} className="w-2 h-2 mr-1" />
                {`${SPECIALTIES[s].name} ${rows.filter((r) => r.on).reduce((n, r) => n + (r.by[s] ?? 0), 0)}h`}
              </span>
            ))}
          </p>
        </SourceCard>
      </div>
    </section>
  );
}

/* ============================================================
   Balanço da semana
   ============================================================ */

type Totals = Record<
  "offer" | "demand" | "cover" | "gap" | "coverInc" | "coverTbd" | "gapInc" | "gapTbd" | "leadNeed" | "leadFit" | "leadOut" | "leadNoWin" | "surplus",
  number
>;

function Balance({ T, useLeads }: { T: Totals; useLeads: boolean }) {
  const lf = useLeads ? T.leadFit : 0;
  const lo = useLeads ? T.leadOut + T.leadNoWin : 0;
  const segs = [
    { k: "ci", v: T.coverInc, label: "Incompletos atendidos", cls: "bg-cyan text-white" },
    { k: "ct", v: T.coverTbd, label: "TBD atendidos", cls: "bg-cyan/50 text-brand-purple-dark" },
    { k: "lf", v: lf, label: "Leads atendidos", cls: "bg-brand-blue text-white" },
    { k: "sur", v: T.surplus, label: "Livre sem procura", cls: "bg-brand-purple-dark/10 text-brand-purple-dark" },
    { k: "gi", v: T.gapInc, label: "Incompletos sem profissional", cls: "bg-brand-red text-white" },
    { k: "gt", v: T.gapTbd, label: "TBD sem profissional", cls: "bg-brand-red/50 text-white" },
    { k: "go", v: lo, label: "Leads sem vaga", cls: `${STRIPES} text-white` },
  ];
  const offer = T.coverInc + T.coverTbd + lf + T.surplus;
  const served = T.coverInc + T.coverTbd + lf;
  const missing = T.gapInc + T.gapTbd + lo;
  const total = Math.max(1, offer + missing);
  const w = (v: number) => `${(v / total) * 100}%`;

  return (
    <div className="flex flex-col">
      <div className="flex h-[26px] items-end mb-[3px]">
        <span className="relative shrink-0 h-2 border-[1.5px] border-b-0 rounded-t-md border-brand-purple-dark/45" style={{ width: w(offer) }}>
          <em className="absolute left-0 bottom-2.5 not-italic text-[12.5px] font-extrabold whitespace-nowrap text-brand-purple-dark">{`Horas livres da equipe · ${offer}h`}</em>
        </span>
        {missing > 0 && (
          <span className="relative shrink-0 h-2 ml-0.5 border-[1.5px] border-b-0 rounded-t-md border-brand-red" style={{ width: w(missing) }}>
            <em className="absolute right-0 bottom-2.5 not-italic text-[12.5px] font-extrabold whitespace-nowrap text-brand-red">{`Falta contratar · ${missing}h`}</em>
          </span>
        )}
      </div>
      <div className="flex h-11 rounded-lg overflow-hidden">
        {segs
          .filter((s) => s.v > 0)
          .map((s) => (
            <i
              key={s.k}
              className={cx("flex items-center justify-center h-full not-italic shadow-[inset_-2px_0_0_#fff]", s.cls)}
              style={{ width: w(s.v) }}
              title={`${s.label}: ${s.v}h`}
            >
              <span className="text-[12.5px] font-black whitespace-nowrap">{s.v / total > 0.045 ? `${s.v}h` : ""}</span>
            </i>
          ))}
      </div>
      <div className="flex h-[26px] items-start mt-[3px]">
        {served > 0 && (
          <span className="relative shrink-0 h-2 border-[1.5px] border-t-0 rounded-b-md border-cyan-dark" style={{ width: w(served) }}>
            <em className="absolute left-0 top-2.5 not-italic text-[12.5px] font-extrabold whitespace-nowrap text-cyan-dark">{`Demanda atendida · ${served}h`}</em>
          </span>
        )}
      </div>
      <p className="mt-[18px] mb-0 pt-3 border-t border-brand-purple-dark/10 grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-x-[18px] gap-y-1.5">
        {segs
          .filter((s) => s.v > 0 || ["ci", "sur", "gi"].includes(s.k))
          .map((s) => (
            <span key={s.k} className="inline-flex items-start gap-1.5 text-xs font-bold leading-snug text-brand-purple-dark/65">
              <i className={cx("shrink-0 mt-0.5 w-3.5 h-2.5 rounded-[3px]", s.cls)}></i>
              <b className="shrink-0 font-black text-brand-purple-dark">{`${s.v}h`}</b>
              {s.label}
            </span>
          ))}
      </p>
    </div>
  );
}

/* ============================================================
   Especialidades e detalhe
   ============================================================ */

function Stack({ cover, fit, gap, out, max }: { cover: number; fit: number; gap: number; out: number; max: number }) {
  const segs: [string, number, string][] = [
    ["cover", cover, "bg-cyan"],
    ["fit", fit, "bg-brand-blue"],
    ["gap", gap, "bg-brand-red"],
    ["out", out, STRIPES],
  ];
  const tot = segs.reduce((n, s) => n + s[1], 0);
  return (
    <span className="flex gap-0.5 h-3 min-w-1" style={{ width: `${Math.max(4, (tot / (max || 1)) * 100)}%` }}>
      {segs
        .filter((s) => s[1] > 0)
        .map(([k, v, cls]) => (
          <i key={k} className={cx("rounded-[3px] min-w-[3px]", cls)} style={{ flexGrow: v }} title={`${v}h`}></i>
        ))}
    </span>
  );
}

function Week({ data, x, useLeads, onCell }: { data: UnitMapData; x: SpecialtyModel; useLeads: boolean; onCell: (y: Slot) => void }) {
  const hours = unitHours(data);
  const weekdays = openWeekdays(data);
  const vals = [...x.slots.values()];
  const up = (y: Slot) => y.gap + (useLeads ? y.leadsOut.length : 0);
  const scale = Math.max(1, ...vals.map(up), ...vals.map((y) => y.left));

  return (
    <div className="grid grid-cols-[40px_minmax(0,1fr)] gap-1.5 overflow-x-auto pb-3">
      <div className="grid grid-rows-[72px_52px] text-[11px] font-extrabold">
        <span className="self-start text-brand-red">Falta</span>
        <span className="self-end text-cyan-dark">Sobra</span>
      </div>
      <div className="grid gap-2.5 min-w-0" style={{ gridTemplateColumns: `repeat(${weekdays.length},minmax(104px,1fr))` }}>
        {weekdays.map((weekday) => (
          <div key={weekday} className="flex flex-col gap-[3px]">
            <div className="grid gap-0.5" style={{ gridTemplateColumns: `repeat(${hours.length},minmax(0,1fr))` }}>
              {hours.map((h) => {
                const y = slotOf(x, weekday, h);
                const o = useLeads ? y.leadsOut.length : 0;
                const li = useLeads ? y.leadsIn.length : 0;
                const empty = !y.free.length && !y.dem.length && !o && !li;
                return (
                  <button
                    key={h}
                    type="button"
                    disabled={empty}
                    onClick={() => onCell(y)}
                    title={`${SHORT_WEEKDAYS[weekday - 1]!.toUpperCase()} ${hh(h)} · ${y.free.length} livre(s), ${y.dem.length} demanda${o ? `, ${o} lead(s) sem vaga` : ""}${li ? `, ${li} lead(s) encaixa(m)` : ""}`}
                    className={cx(
                      "relative grid grid-rows-[72px_52px] p-0 border-0 rounded-[3px] cursor-pointer disabled:cursor-default enabled:hover:bg-brand-blue/15",
                      h < 12 ? "bg-brand-purple-dark/[0.025]" : "bg-transparent",
                    )}
                  >
                    <span className="flex flex-col justify-end border-b-[1.5px] border-brand-purple-dark/35">
                      {o > 0 && <i className={cx("block w-full min-h-[3px] rounded-t-[3px]", STRIPES)} style={{ height: `${(o / scale) * 100}%` }}></i>}
                      {y.gap > 0 && (
                        <i className={cx("block w-full min-h-[3px] bg-brand-red", o > 0 ? "" : "rounded-t-[3px]")} style={{ height: `${(y.gap / scale) * 100}%` }}></i>
                      )}
                    </span>
                    <span className="flex flex-col justify-start">
                      {y.left > 0 && <i className="block w-full min-h-[3px] bg-cyan/50 rounded-b-[3px]" style={{ height: `${(y.left / scale) * 100}%` }}></i>}
                    </span>
                    {li > 0 && <span aria-hidden="true" className="absolute left-1/2 top-[76px] w-1.5 h-1.5 -ml-[3px] rounded-full bg-brand-blue-dark"></span>}
                  </button>
                );
              })}
            </div>
            <div className="grid gap-0.5" style={{ gridTemplateColumns: `repeat(${hours.length},minmax(0,1fr))` }}>
              {hours.map((h) => (
                <span key={h} className="text-[10px] text-center text-brand-purple-dark/50">
                  {h % 2 ? "" : h}
                </span>
              ))}
            </div>
            <div className="text-center text-[12.5px] font-extrabold text-brand-purple-dark/70">{CALENDAR_WEEKDAYS[weekday - 1]!.split("-")[0]}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function CellModal({ specialty, y, useLeads, onClose }: { specialty: Specialty; y: Slot; useLeads: boolean; onClose: () => void }) {
  const name = SPECIALTIES[specialty].name;
  const g = y.gap + (useLeads ? y.leadsOut.length : 0);
  const tone = g ? "bg-brand-red/10" : y.left ? "bg-cyan/10" : "bg-brand-orange/10";
  const Tag = ({ type }: { type: DemandType | "lead" }) => {
    const t = DEMAND_TYPES.find((z) => z.id === type);
    return (
      <span
        className={cx(
          "shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11.5px] font-extrabold",
          type === "inc" && "bg-white text-brand-orange-dark ring-1 ring-inset ring-brand-orange/50",
          type === "tbd" && "bg-neutral-100 text-brand-purple-dark",
          type === "lead" && "bg-brand-blue/15 text-brand-blue-dark",
        )}
      >
        <Icon type="solid" name={t?.icon ?? "fa-user-plus"} />
        {t?.short ?? "Lead"}
      </span>
    );
  };
  const Item = ({ children }: { children: ReactNode }) => (
    <div className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg bg-brand-purple-dark/[0.03] mb-1.5">{children}</div>
  );
  const ColTitle = ({ children, top }: { children: ReactNode; top?: boolean }) => (
    <p className={cx("mb-2 text-xs font-black uppercase tracking-wide text-brand-purple-dark/60", top ? "mt-3" : "mt-0")}>{children}</p>
  );
  const None = ({ children }: { children: ReactNode }) => <p className="m-0 text-[13px] text-brand-purple-dark/50">{children}</p>;

  return (
    <Modal id="panorama_cell_modal" show title={`${name} · ${CALENDAR_WEEKDAYS[y.weekday - 1]}, ${hh(y.hour)}`} variant="medium" onCancel={onClose}>
      <div className="flex flex-col gap-4">
        <p className={cx("m-0 px-3.5 py-3 rounded-[10px] text-sm font-bold text-brand-purple-dark", tone)}>
          {g
            ? `${g === 1 ? "Falta" : "Faltam"} ${pl(g, "hora", "horas")} de ${name} neste horário${y.cover ? `; ${y.cover} já ${y.cover === 1 ? "cabe" : "cabem"} na equipe atual` : ""}.`
            : y.left
              ? `Sobram ${pl(y.left, "horário livre", "horários livres")} depois de atender a demanda.`
              : "Oferta e demanda equilibradas."}
        </p>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <ColTitle>{`Demanda (${y.dem.length})`}</ColTitle>
            {!y.dem.length && <None>Nenhuma.</None>}
            {y.dem.map((it) => (
              <Item key={it.id}>
                <Tag type={it.type} />
                <b className="text-sm font-bold text-brand-purple-dark">{it.patient}</b>
              </Item>
            ))}
            {useLeads && y.leadsOut.length > 0 && (
              <>
                <ColTitle top>{`Leads sem vaga (${y.leadsOut.length})`}</ColTitle>
                {y.leadsOut.map((n, i) => (
                  <Item key={i}>
                    <Tag type="lead" />
                    <b className="text-sm font-bold text-brand-purple-dark">{n}</b>
                  </Item>
                ))}
              </>
            )}
          </div>
          <div>
            <ColTitle>{`Profissionais livres (${y.free.length})`}</ColTitle>
            {!y.free.length && <None>Nenhum.</None>}
            {y.free.map((p) => (
              <Item key={p.id}>
                <Avatar size="small" />
                <b className="text-sm font-bold text-brand-purple-dark">{p.name}</b>
              </Item>
            ))}
            {useLeads && y.leadsIn.length > 0 && (
              <>
                <ColTitle top>{`Leads que encaixam (${y.leadsIn.length})`}</ColTitle>
                {y.leadsIn.map((n, i) => (
                  <Item key={i}>
                    <Tag type="lead" />
                    <b className="text-sm font-bold text-brand-purple-dark">{n}</b>
                  </Item>
                ))}
              </>
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
}

/* ============================================================
   Página
   ============================================================ */

export function Panorama({ data }: { data: UnitMapData }) {
  const [types, setTypes] = useState<DemandType[]>(["inc", "tbd"]);
  const [useLeads, setUseLeads] = useState(true);
  const [includeTbd, setIncludeTbd] = useState(true);
  const [fromStage, setFromStage] = useState<LeadStatus>("avaliacao");
  const [selected, setSelected] = useState<Specialty | null>(null);
  const [cell, setCell] = useState<Slot | null>(null);
  const toggleType = (t: DemandType) => setTypes((ts) => (ts.includes(t) ? ts.filter((x) => x !== t) : [...ts, t]));

  const m = panoramaModel(data, ORDERED_SPECIALTIES, { includeTbd, types, useLeads, fromStage });
  const leads = activeLeads(data, fromStage);
  const rows = ORDERED_SPECIALTIES.filter((s) => m[s].offer || m[s].demand || m[s].leadNeed).sort(
    (a, b) => m[b].need - m[a].need || m[a].surplus - m[b].surplus,
  );
  const sid = selected && rows.includes(selected) ? selected : rows[0];
  const keys = ["offer", "demand", "cover", "gap", "coverInc", "coverTbd", "gapInc", "gapTbd", "leadNeed", "leadFit", "leadOut", "leadNoWin", "surplus"] as const;
  const T = Object.fromEntries(keys.map((k) => [k, rows.reduce((n, s) => n + m[s][k], 0)])) as Totals;
  const need = T.gap + (useLeads ? T.leadOut + T.leadNoWin : 0);
  const max = Math.max(1, ...rows.map((s) => m[s].cover + m[s].leadFit + m[s].gap + m[s].leadOut));
  const hire = rows.filter((s) => m[s].need > 0);

  const compose = (
    <Compose
      data={data}
      includeTbd={includeTbd}
      setIncludeTbd={setIncludeTbd}
      types={types}
      toggleType={toggleType}
      useLeads={useLeads}
      setUseLeads={setUseLeads}
      fromStage={fromStage}
    />
  );

  if (!sid) {
    return (
      <div className="flex flex-col gap-[18px]">
        {compose}
        <p className="text-center py-8 text-neutral-600">Nenhuma oferta ou demanda na unidade para a semana.</p>
      </div>
    );
  }

  const x = m[sid];
  const topBlock = x.blocks.slice().sort((a, b) => b.hrs - a.hrs)[0];

  return (
    <div className="flex flex-col gap-[18px]">
      {compose}

      {useLeads && (
        <label className="-mt-1 self-end inline-flex items-center gap-2">
          <span className="text-[13px] font-bold text-brand-purple-dark/60 whitespace-nowrap">Leads considerados a partir da etapa</span>
          <Input
            type="select"
            field={field("from_stage", fromStage, "panorama")}
            options={LEAD_STAGES.map((s) => [s.label, s.id] as const)}
            className="min-w-[200px]"
            onChange={(value) => value && setFromStage(value as LeadStatus)}
          />
        </label>
      )}

      <section className="flex flex-col gap-[18px] px-[22px] py-5 rounded-[14px] bg-brand-purple-dark/[0.035]">
        <div className="flex flex-col gap-1.5">
          <Kicker>Balanço da semana</Kicker>
          <h2 className="m-0 text-[22px] font-extrabold leading-tight text-brand-purple-dark text-pretty">
            {need > 0 ? (
              <>
                Faltam <b className="font-black text-brand-red">{`${need}h`}</b>
                {` de atendimento, cerca de ${fte(need)} profissionais de ${FTE}h`}
              </>
            ) : (
              "A equipe atual cobre toda a demanda"
            )}
          </h2>
          <p className="m-0 text-sm leading-normal text-brand-purple-dark/70 text-pretty">
            {`Incompletos têm prioridade sobre TBD em cada horário, e os leads entram no que sobra. A equipe atual cobre ${T.cover} das ${T.demand}h de demanda${
              useLeads && T.leadNeed ? ` e encaixa ${T.leadFit} das ${T.leadNeed}h pedidas pelos ${pl(leads.length, "lead", "leads")}` : ""
            }. ${T.surplus ? `Sobram ${T.surplus}h livres em horários sem procura.` : ""}`}
          </p>
        </div>
        <Balance T={T} useLeads={useLeads} />
      </section>

      <div className="grid grid-cols-1 xl:grid-cols-[minmax(260px,340px)_minmax(0,1fr)] gap-[18px] items-start">
        <section className="flex flex-col gap-1.5">
          <Kicker className="mb-1">
            {hire.length ? `${pl(hire.length, "especialidade precisa", "especialidades precisam")} de contratação` : "Nenhuma especialidade precisa de contratação"}
          </Kicker>
          {rows.map((s) => {
            const y = m[s];
            return (
              <button
                key={s}
                type="button"
                onClick={() => setSelected(s)}
                className={cx(
                  "grid grid-cols-[minmax(0,1fr)_auto] gap-x-2.5 gap-y-2 px-3.5 py-[11px] border rounded-xl text-left cursor-pointer transition-colors hover:border-brand-blue",
                  s === sid ? "border-brand-blue bg-brand-blue/10 ring-1 ring-brand-blue" : "border-neutral-100 bg-white",
                )}
              >
                <span className="flex items-center min-w-0">
                  <Dot specialty={s} />
                  <b className="text-sm font-extrabold text-brand-purple-dark truncate">{SPECIALTIES[s].name}</b>
                </span>
                <span>
                  {y.need > 0 ? (
                    <em className="not-italic text-[12.5px] font-extrabold whitespace-nowrap text-brand-red">{`Contratar ${y.need}h`}</em>
                  ) : y.surplus ? (
                    <em className="not-italic text-[12.5px] font-extrabold whitespace-nowrap text-cyan-dark">{`Sobra ${y.surplus}h`}</em>
                  ) : (
                    <em className="not-italic text-[12.5px] font-extrabold whitespace-nowrap text-brand-purple-dark/55">Equilibrado</em>
                  )}
                </span>
                <span className="col-span-full flex">
                  <Stack cover={y.cover} fit={useLeads ? y.leadFit : 0} gap={y.gap} out={useLeads ? y.leadOut : 0} max={max} />
                </span>
              </button>
            );
          })}
        </section>

        <section className="flex flex-col gap-4 px-5 py-[18px] border border-neutral-100 rounded-[14px] bg-white min-w-0">
          <header>
            <h3 className="m-0 flex items-center text-lg font-extrabold text-brand-purple-dark">
              <Dot specialty={sid} />
              {SPECIALTIES[sid].name}
            </h3>
            <p className="mt-1 mb-0 text-[13px] text-brand-purple-dark/65">
              {`Oferta livre ${x.offer}h · Demanda ${x.demand}h${
                types.length ? ` (${DEMAND_TYPES.filter((t) => types.includes(t.id)).map((t) => `${t.label} ${x.byType[t.id]}h`).join(", ")})` : ""
              }${useLeads && x.leadNeed ? ` · Leads ${x.leadNeed}h` : ""}`}
            </p>
          </header>

          {x.need > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-[auto_minmax(0,1fr)] gap-x-6 gap-y-4 px-[18px] py-4 rounded-xl bg-brand-red/5 ring-1 ring-inset ring-brand-red/25">
              <div className="flex flex-col gap-0.5 md:pr-6 md:border-r border-brand-red/20">
                <span className="text-xs font-black uppercase tracking-wide text-brand-red">Vaga sugerida</span>
                <b className="text-[34px] font-black leading-tight text-brand-purple-dark">
                  {`${x.need}h`}
                  <em className="not-italic text-sm font-bold text-brand-purple-dark/55 ml-0.5">/semana</em>
                </b>
                <span className="text-[12.5px] font-bold text-brand-purple-dark/65">{`≈ ${fte(x.need)} profissional de ${FTE}h`}</span>
              </div>
              <div className="flex flex-col gap-2 min-w-0">
                <span className="text-[12.5px] font-extrabold text-brand-purple-dark/70">Períodos em que falta profissional</span>
                <div className="flex gap-1.5 flex-wrap">
                  {x.blocks.map((b, i) => {
                    const top = b === topBlock;
                    return (
                      <span
                        key={i}
                        className={cx("flex flex-col px-2.5 py-1.5 rounded-lg", top ? "bg-brand-red" : "bg-white ring-1 ring-inset ring-brand-red/30")}
                      >
                        <b className={cx("text-[13px] font-extrabold", top ? "text-white" : "text-brand-purple-dark")}>
                          {`${SHORT_WEEKDAYS[b.weekday - 1]!.toUpperCase()} · ${b.period.label}`}
                        </b>
                        <em className={cx("not-italic text-xs", top ? "text-white" : "text-brand-purple-dark/65")}>{`${hh(b.from)}–${hh(b.to)} · ${b.hrs}h`}</em>
                      </span>
                    );
                  })}
                </div>
                {x.leadNoWin > 0 && (
                  <p className="m-0 flex gap-1.5 text-[12.5px] text-brand-purple-dark/70">
                    <Icon type="solid" name="fa-circle-info" className="mt-0.5 text-brand-blue-dark" />
                    {`${x.leadNoWin}h de leads sem disponibilidade da família preenchida entram no total, mas não têm período.`}
                  </p>
                )}
              </div>
            </div>
          ) : (
            <p className="m-0 flex items-center gap-2.5 px-4 py-3.5 rounded-xl bg-cyan/10 text-sm font-bold text-brand-purple-dark">
              <Icon type="solid" name="fa-circle-check" className="text-cyan-dark" />
              {x.surplus ? `A equipe atual cobre toda a demanda e sobram ${x.surplus}h livres.` : "Oferta e demanda equilibradas."}
            </p>
          )}

          <div className="flex flex-col gap-2.5">
            <div className="flex items-center justify-between gap-x-4 gap-y-2 flex-wrap">
              <h4 className="m-0 text-[14.5px] font-extrabold text-brand-purple-dark">Semana por horário</h4>
              <p className="m-0 flex gap-x-3.5 gap-y-1.5 flex-wrap">
                {[
                  ["Falta", "w-3.5 h-2.5 rounded-[3px] bg-brand-red", true],
                  ["Falta (leads)", cx("w-3.5 h-2.5 rounded-[3px]", STRIPES), useLeads],
                  ["Sobra", "w-3.5 h-2.5 rounded-[3px] bg-cyan/50", true],
                  ["Lead encaixa", "w-2 h-2 rounded-full bg-brand-blue-dark", useLeads],
                ]
                  .filter(([, , show]) => show)
                  .map(([label, cls]) => (
                    <span key={label as string} className="inline-flex items-center gap-1.5 text-xs font-bold whitespace-nowrap text-brand-purple-dark/65">
                      <i className={cls as string}></i>
                      {label as string}
                    </span>
                  ))}
              </p>
            </div>
            <Week data={data} x={x} useLeads={useLeads} onCell={setCell} />
            <p className="m-0 text-xs text-brand-purple-dark/55">Clique em um horário para ver pacientes, leads e profissionais livres.</p>
          </div>
        </section>
      </div>

      {cell && <CellModal specialty={sid} y={cell} useLeads={useLeads} onClose={() => setCell(null)} />}
    </div>
  );
}
