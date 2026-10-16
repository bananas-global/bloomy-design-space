/**
 * Padrão de Agenda — a aba "Mapa de Horas › Padrão de Agenda" do paciente.
 *
 * Trazido do protótipo `Padrão de Agenda` do Claude Design para os componentes
 * do sistema. A semana padrão do paciente numa grade de segunda a sexta, das
 * 08:00 às 18:00, editada no painel ao lado, e as vigências do padrão.
 *
 * Feito na tela, sem equivalente no Phoenix (componente novo para o dev): a
 * grade semanal com os atendimentos, as pílulas de especialidade que filtram os
 * horários livres, o painel de edição e o rodapé fixo de alterações pendentes.
 * O resto é `backoffice`, `lazy_tabs` do paciente, `button`, `input`, `tag`,
 * `radio_selector`, `dropdown` e `modal`.
 */
import { useState, type CSSProperties, type KeyboardEvent, type MouseEvent, type ReactNode } from "react";
import type { ScenarioContext, ScreenProps } from "@brucesantos/design-space";
import { Button } from "../components/Button.js";
import { RadioSelector } from "../components/Choice.js";
import { Icon } from "../components/Icon.js";
import { Input, SwitchCard, type SelectItem } from "../components/Input.js";
import { LoadingCard } from "../components/Layout.js";
import { Dropdown, Modal } from "../components/Overlay.js";
import { Tag } from "../components/Tag.js";
import { BackofficeLayout } from "../layouts/BackofficeLayout.js";
import { PatientLayout } from "../layouts/PatientLayout.js";
import type { AgendaFixture } from "./padrao-agenda/fixtures.js";
import {
  DAYS_FULL, DAY_ABBR, HOURS, LOCATIONS, PROFS, SERVICES, SHORT, SPEC, SPECS, STATE_ORDER, WEEKDAYS,
  addDays, br, first, hh, profState, range, vigStatus,
  splitPlan, TODAY, type AgendaItem, type ProfState, type SplitPiece, type SpecSlug, type Vigencia,
} from "./padrao-agenda/model.js";
import { PlanoTerapeutico } from "./padrao-agenda/PlanoTerapeutico.js";

export const PATH = "/backoffice/pacientes/:id/padrao-de-agenda";

type Slot = { weekday: number; hour: number };
type Form = Omit<AgendaItem, "id" | "room"> & { room: string; slots?: Slot[] };
type Draft = { id: string | null; start: string; end: string; autoRenew: boolean };

type State = {
  items: AgendaItem[];
  sel: { id?: string; weekday?: number; hour?: number } | null;
  f: Form | null;
  err: string;
  lens: SpecSlug | "none";
  lastSlug: SpecSlug;
  vigs: Vigencia[];
  vigId: string;
  byVig: Record<string, AgendaItem[]>;
  vigModal: Draft | null;
  vigErr: string;
  split: { start: string; end: string } | null;
  splitErr: string;
  dirty: boolean;
  plan: boolean;
};

const tone = (slug: SpecSlug) => `var(--color-${SPEC[slug].tone})`;
const mix = (c: string, p: number, w = "#fff") => `color-mix(in srgb, ${c} ${p}%, ${w})`;
const strongOf = (c: string) => mix(c, 60, "var(--color-brand-purple-dark)");
const newId = () => `a_${Math.random().toString(36).slice(2)}`;
const val = (e: unknown) => (e && typeof e === "object" && "target" in e ? (e as { target: { value: string } }).target.value : String(e ?? ""));

const NOTIFICATIONS = [
  { id: "n1", title: "Padrão de agenda atualizado", content: "O mapa de horas de Lucas Andrade Ferreira foi revisado.", insertedAt: "há 2 horas" },
  { id: "n2", title: "Autorização parcial", content: "A guia de Davi Lima foi autorizada parcialmente.", insertedAt: "há 1 dia", readAt: "13/10/2026 10:12" },
];
const CURRENT_USER = { name: "Marina Alves", units: ["Unidade Jardim", "Unidade Girassol"], roles: ["Admin", "Coordenador"], professional: true };

/** O estado de abertura de cada cenário (controle `estado`). */
function initialState(data: AgendaFixture, controls: Record<string, string>): State {
  const vigId = data.vigencias.some((v) => v.id === controls.vigencia) ? controls.vigencia! : data.current;
  const items = data.items[vigId] ?? [];
  const lens = (SPECS.some((s) => s.slug === controls.lente) ? controls.lente : "none") as SpecSlug | "none";
  const base: State = {
    items, sel: null, f: null, err: "", lens, lastSlug: "psychology",
    vigs: data.vigencias, vigId, byVig: { ...data.items },
    vigModal: null, vigErr: "", split: null, splitErr: "", dirty: false, plan: false,
  };
  const blank = (slots: Slot[]): Form => ({
    type: "patient", slug: lens !== "none" ? lens : "psychology", slots, service: "", professional: "",
    location: "", room: "none", weekday: slots[0]!.weekday, hour: slots[0]!.hour,
  });
  const added: AgendaItem = { id: "a_new", weekday: 2, hour: 14, slug: "phonoaudiology", service: "Fono - Linguagem", professional: "Fábio Stoll Pereira", location: "in_clinic", type: "patient" };
  const cur = data.vigencias.find((v) => v.id === vigId)!;
  switch (controls.estado) {
    case "novo":
      return { ...base, sel: { weekday: 1, hour: 9 }, f: blank([{ weekday: 1, hour: 9 }]) };
    case "varios": {
      const slots = [{ weekday: 1, hour: 9 }, { weekday: 3, hour: 9 }, { weekday: 5, hour: 10 }];
      return { ...base, sel: { weekday: 1, hour: 9 }, f: blank(slots) };
    }
    case "editar": {
      const it = items[0];
      return it ? { ...base, sel: { id: it.id }, f: { ...it, room: it.room || "none" } } : base;
    }
    case "alterado":
      return { ...base, items: [...items, added], dirty: true };
    case "propagar": {
      return { ...base, items: [...items, added], dirty: true, split: { start: addDays(TODAY, 1), end: cur.end } };
    }
    case "plano":
      return { ...base, plan: true };
    case "nova-vigencia": {
      const last = data.vigencias.reduce((m, v) => (v.end > m ? v.end : m), "");
      const start = last ? addDays(last, 1) : TODAY;
      return { ...base, vigModal: { id: null, start, end: addDays(start, 90), autoRenew: true } };
    }
    default:
      return base;
  }
}

export function PadraoAgenda({ context }: ScreenProps) {
  const data = context.data as AgendaFixture | undefined;
  const name = data?.patient.name ?? "Paciente";
  return (
    <BackofficeLayout
      context={context}
      currentPath="/backoffice/pacientes"
      breadcrumbs={[{ label: "Pacientes", to: "/backoffice/pacientes" }, { label: name }]}
      currentUser={CURRENT_USER}
      notifications={NOTIFICATIONS}
    >
      {/* Cabeçalho do backoffice fixo nesta tela: o `sticky` do layout fica no
          `div` de dentro do `<header>`, que tem a mesma altura e não deixa grudar. */}
      <style>{"#main-content > header{position:sticky;top:0;z-index:45}"}</style>
      {data ? (
        <Agenda key={`${context.fixture?.id}|${JSON.stringify(context.controls)}`} data={data} context={context} />
      ) : (
        <LoadingCard message={context.error ? "Não foi possível carregar o padrão de agenda." : "Carregando o padrão de agenda…"} />
      )}
    </BackofficeLayout>
  );
}

function Agenda({ data, context }: { data: AgendaFixture; context: ScenarioContext }) {
  const [state, setState] = useState<State>(() => initialState(data, context.controls));
  const set = (patch: Partial<State> | ((s: State) => Partial<State>)) =>
    setState((s) => ({ ...s, ...(typeof patch === "function" ? patch(s) : patch) }));

  const showPref = context.controls.preferencias !== "nao";
  const compact = context.controls.densidade !== "confortavel";
  const { items, sel, f, lens, err, vigs, vigId, byVig } = state;
  const editingId = sel?.id;
  const isPref = (wd: number, h: number) => (data.pref[wd] ?? []).includes(h);
  const vigItems = (id: string) => byVig[id] ?? [];
  const cur = vigs.find((v) => v.id === vigId) ?? vigs[0]!;
  const curSt = vigStatus(cur);

  // ——— edição de um horário ———
  const up = (patch: Partial<Form>) => set((s) => ({ err: "", f: s.f && { ...s.f, ...patch } }));
  const close = () => set({ sel: null, f: null, err: "" });
  const suggest = (slug: SpecSlug, wd: number, h: number, selfId?: string) =>
    PROFS[slug].find((p) => profState(p, wd, h, items, selfId).s === "free") ?? "";
  const openEdit = (it: AgendaItem) => set({ sel: { id: it.id }, err: "", f: { ...it, room: it.room || "none", location: it.location || "in_clinic" } });

  const openNew = (wd: number, h: number, e?: { shiftKey: boolean }) => {
    const taken = items.find((x) => x.weekday === wd && x.hour === h);
    if (e?.shiftKey && f && !editingId) {
      if (taken) return;
      const slots = f.slots ?? [{ weekday: f.weekday, hour: f.hour }];
      const has = slots.some((s) => s.weekday === wd && s.hour === h);
      if (has && slots.length === 1) return;
      const next = has
        ? slots.filter((s) => !(s.weekday === wd && s.hour === h))
        : [...slots, { weekday: wd, hour: h }].sort((a, b) => a.weekday - b.weekday || a.hour - b.hour);
      return up({ slots: next, weekday: next[0]!.weekday, hour: next[0]!.hour });
    }
    if (taken) return openEdit(taken);
    const slug = lens !== "none" ? lens : state.lastSlug;
    set({ sel: { weekday: wd, hour: h }, err: "", f: { type: "patient", slug, slots: [{ weekday: wd, hour: h }], service: "", professional: "", location: "", room: "none", weekday: wd, hour: h } });
  };

  const save = () => {
    if (!f) return;
    if (!f.service) return set({ err: "Selecione o serviço." });
    if (!f.professional) return set({ err: "Selecione um profissional livre." });
    if (!f.location) return set({ err: "Selecione o local." });
    if (!editingId && f.slots && f.slots.length > 1) {
      const bad = f.slots.find((s) => items.some((x) => x.weekday === s.weekday && x.hour === s.hour) || profState(f.professional, s.weekday, s.hour, items, null).s !== "free");
      if (bad) return set({ err: `${first(f.professional)} não está livre em ${DAYS_FULL[bad.weekday - 1]} ${hh(bad.hour)}.` });
      const news = f.slots.map((s): AgendaItem => ({ id: newId(), weekday: s.weekday, hour: s.hour, slug: f.slug, service: f.service, professional: f.professional, location: f.location, type: f.type }));
      return set((s) => ({ items: [...s.items, ...news], dirty: true, lastSlug: f.slug, sel: null, f: null, err: "" }));
    }
    if (items.some((x) => x.id !== editingId && x.weekday === f.weekday && x.hour === f.hour)) return set({ err: "Já existe um agendamento neste horário." });
    const st = profState(f.professional, f.weekday, f.hour, items, editingId);
    const orig = editingId ? items.find((x) => x.id === editingId) : undefined;
    const unchanged = orig && orig.professional === f.professional && orig.weekday === f.weekday && orig.hour === f.hour;
    if (st.s !== "free" && !unchanged) return set({ err: `${first(f.professional)} não está livre neste horário.` });
    const item: AgendaItem = {
      id: editingId ?? newId(), weekday: f.weekday, hour: f.hour, slug: f.slug, service: f.service, professional: f.professional,
      location: f.location, room: f.location === "in_clinic" && f.room !== "none" ? f.room : "", type: f.type,
    };
    set((s) => ({
      items: s.items.some((p) => p.id === item.id) ? s.items.map((p) => (p.id === item.id ? item : p)) : [...s.items, item],
      dirty: true, lastSlug: f.slug, sel: null, f: null, err: "",
    }));
  };
  const remove = () => set((s) => ({ items: s.items.filter((p) => p.id !== editingId), dirty: true, sel: null, f: null, err: "" }));

  // ——— salvar o padrão e as vigências ———
  const discard = () => set({ items: vigItems(vigId), dirty: false, sel: null, f: null, err: "" });
  const commit = () => {
    if (curSt.order !== 0) return set((s) => ({ byVig: { ...s.byVig, [cur.id]: s.items }, dirty: false }));
    set({ sel: null, f: null, err: "", splitErr: "", split: { start: addDays(TODAY, 1), end: cur.end } });
  };
  const confirmSplit = () => {
    const m = state.split;
    if (!m) return;
    if (!m.start || !m.end) return set({ splitErr: "Informe início e término." });
    if (m.end < m.start) return set({ splitErr: "O término deve ser após o início." });
    if (m.start < TODAY) return set({ splitErr: `O novo padrão não pode começar antes de hoje (${br(TODAY)}).` });
    // A vigência que cobre o início é quebrada: encerra na véspera e, se ia
    // além do término, volta a valer depois dele (`splitPlan`).
    const nid = `v${Date.now()}`;
    const nextByVig = { ...byVig, [vigId]: vigItems(vigId), [nid]: items };
    const touched = new Set<string>();
    const next: Vigencia[] = [];
    splitPlan(vigs, m.start, m.end).forEach((p, i) => {
      if (!p.from) return next.push({ id: nid, start: p.start, end: p.end, autoRenew: cur.autoRenew });
      touched.add(p.from.id);
      if (p.kind === "substituida") return;
      const id = p.kind === "retomada" ? `${nid}r${i}` : p.from.id;
      next.push({ ...p.from, id, start: p.start, end: p.end });
      if (id !== p.from.id) nextByVig[id] = nextByVig[p.from.id] ?? [];
    });
    set({ vigs: [...vigs.filter((v) => !touched.has(v.id)), ...next], byVig: nextByVig, vigId: nid, split: null, splitErr: "", dirty: false });
  };
  const novaVig = () => {
    const last = vigs.reduce((m, v) => (v.end > m ? v.end : m), "");
    const start = last ? addDays(last, 1) : TODAY;
    set({ vigErr: "", vigModal: { id: null, start, end: addDays(start, 90), autoRenew: true } });
  };
  const saveVig = () => {
    const m = state.vigModal;
    if (!m) return;
    if (!m.start || !m.end) return set({ vigErr: "Informe início e término." });
    if (m.end < m.start) return set({ vigErr: "O término deve ser após o início." });
    const clash = vigs.find((v) => v.id !== m.id && m.start <= v.end && v.start <= m.end);
    if (clash) return set({ vigErr: `Sobrepõe a vigência ${range(clash)}.` });
    if (m.id) return set({ vigs: vigs.map((v) => (v.id === m.id ? { ...v, start: m.start, end: m.end, autoRenew: m.autoRenew } : v)), vigModal: null, vigErr: "" });
    const id = `v${Date.now()}`;
    set((s) => ({ byVig: { ...s.byVig, [id]: s.items }, vigs: [...s.vigs, { id, start: m.start, end: m.end, autoRenew: m.autoRenew }], vigId: id, vigModal: null, vigErr: "", sel: null, f: null }));
  };
  const pickVig = (v: Vigencia) => set({ vigId: v.id, items: vigItems(v.id), dirty: false, sel: null, f: null });

  // ——— a grade ———
  const lensOn = lens !== "none";
  const freeCount = (wd: number, h: number) => (lensOn ? PROFS[lens].filter((p) => profState(p, wd, h, items, null).s === "free").length : 0);
  const counts: Partial<Record<SpecSlug, number>> = {};
  items.forEach((it) => { counts[it.slug] = (counts[it.slug] ?? 0) + 1; });
  const pill = (bg: string): CSSProperties => ({ background: bg });
  const lensPill = lensOn ? mix(tone(lens), 70, "var(--color-brand-purple-dark)") : "var(--color-neutral-500)";
  const multi = !editingId && !!f?.slots && f.slots.length > 1;

  const cell = (wd: number, h: number) => {
    const pref = isPref(wd, h) && showPref;
    const ghost = !!(f && !editingId && (f.slots ?? [{ weekday: f.weekday, hour: f.hour }]).some((s) => s.weekday === wd && s.hour === h));
    const n = freeCount(wd, h);
    const nTxt = n ? `${n} livre${n > 1 ? "s" : ""}` : "0 livres";
    const ring = items.some((it) => it.id === editingId && it.weekday === wd && it.hour === h) ? "inset 0 0 0 2px var(--color-brand-blue)" : "none";
    const hatch = "repeating-linear-gradient(135deg, rgba(43,35,91,.035) 0 6px, rgba(43,35,91,.09) 6px 8px)";
    const empty = lensOn ? (n ? "rgba(43,35,91,.035)" : hatch) : ghost ? "rgba(88,186,218,.14)" : "rgba(43,35,91,.035)";
    const cellIt = items.find((it) => it.weekday === wd && it.hour === h);
    const bg = cellIt
      ? lensOn && !n
        ? `repeating-linear-gradient(135deg, transparent 0 6px, rgba(43,35,91,.09) 6px 8px), ${mix(tone(cellIt.slug), 16)}`
        : mix(tone(cellIt.slug), 16)
      : empty;
    const chips = items.filter((it) => it.weekday === wd && it.hour === h);
    const title = [isPref(wd, h) && "Horário preferencial da família", lensOn ? `${n} profissional(is) livre(s) de ${SPEC[lens].name}` : "Clique para adicionar"].filter(Boolean).join(" · ");

    return (
      <div
        key={wd}
        role="gridcell"
        tabIndex={0}
        title={title}
        onMouseDown={(e) => { if (e.shiftKey) e.preventDefault(); }}
        onClick={(e) => openNew(wd, h, e)}
        onKeyDown={(e: KeyboardEvent) => { if (e.key === "Enter" && e.target === e.currentTarget) { e.preventDefault(); openNew(wd, h); } }}
        className="relative rounded-lg flex flex-col gap-[3px] cursor-pointer outline-none transition-[background] duration-150 hover:brightness-[.97]"
        style={{ minHeight: compact ? 40 : 56, padding: `3px ${pref || lensOn ? 20 : 3}px 3px 3px`, background: bg, boxShadow: ring }}
      >
        {pref && <Icon name="fa-star" type="solid" className="absolute top-1/2 right-[7px] -translate-y-1/2 text-[10px] leading-none text-warning-dark" />}
        {lensOn && n > 0 && !chips.length && (
          <span className="self-end my-auto mx-1 px-[7px] py-px rounded-full text-white text-[10.5px] font-bold leading-[1.5] pointer-events-none" style={pill(lensPill)}>{nTxt}</span>
        )}
        {chips.map((it) => {
          const c = tone(it.slug);
          return (
            <button
              key={it.id}
              type="button"
              title={`${SPEC[it.slug].name} · ${it.service} · ${it.professional}${it.room ? ` · ${it.room}` : ""}`}
              onClick={(e: MouseEvent) => { e.stopPropagation(); if (e.shiftKey && f && !editingId) return; openEdit(it); }}
              className="flex-1 flex items-center gap-1.5 w-full min-h-0 px-1 border-0 bg-transparent text-left cursor-pointer overflow-hidden"
            >
              <span className="flex items-center gap-1.5 min-w-0" style={{ opacity: lensOn && editingId !== it.id ? 0.8 : 1 }}>
                <b className="text-[11.5px] font-black" style={{ color: strongOf(c) }}>{SHORT[it.slug]}</b>
                <span className="min-w-0 text-[11.5px] font-bold text-brand-purple-dark whitespace-nowrap overflow-hidden text-ellipsis">{first(it.professional)}</span>
                {it.type === "at" && <em className="flex-none not-italic px-1.5 py-px rounded-full bg-brand-purple-dark text-white text-[10px] font-bold tracking-[.02em] leading-[1.4]">AT</em>}
              </span>
              <span className="flex-1" />
              {lensOn && n > 0 && <span className="flex-none px-[7px] py-px rounded-full text-white text-[10.5px] font-bold leading-[1.5]" style={pill(lensPill)}>{nTxt}</span>}
            </button>
          );
        })}
        {ghost && <span className="absolute inset-0 border-[2.5px] border-dashed border-brand-blue rounded-lg pointer-events-none" />}
      </div>
    );
  };

  const shiftHint = multi ? "Shift + clique em um horário selecionado para removê-lo" : "Segure Shift e clique para selecionar mais horários";
  const grid = "grid grid-cols-[52px_repeat(5,minmax(96px,1fr))] gap-[3px]";

  const body = (
    <div data-screen-label="Padrão de Agenda" className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3 flex-wrap">
          <h2 className="m-0 text-[22px] font-extrabold text-brand-purple-dark">Padrão de Agenda</h2>
          {curSt.order === 2 && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-neutral-100 text-[12.5px] font-bold text-neutral-600">
              <Icon name="fa-lock" type="solid" className="text-[11px]" />Vigência encerrada · somente leitura
            </span>
          )}
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <VigenciaPicker vigs={vigs} cur={cur} onPick={pickVig} onNew={novaVig} />
          <Button type="button" variant="tint" color="blue" rightIcon="fa-file-pdf" onClick={() => set({ plan: true })}>Plano Terapêutico</Button>
          <Button type="button" variant="tint" color="blue" rightIcon="fa-file-pdf">Agendamentos</Button>
        </div>
      </div>

      <div className="flex flex-wrap gap-6 items-start">
        <div className="min-w-0 flex flex-col gap-3" style={{ flex: "999 1 580px" }}>
          <div className="flex flex-wrap items-center gap-1.5">
            {SPECS.map((s) => {
              const on = lens === s.slug, c = tone(s.slug);
              return (
                <button
                  key={s.slug}
                  type="button"
                  aria-pressed={on}
                  title={on ? "Clique para limpar o filtro" : `Ver horários livres de ${s.name}`}
                  onClick={() => set({ lens: on ? "none" : s.slug })}
                  className="inline-flex items-center gap-[7px] px-[9px] py-1 rounded-lg border text-[12.5px] font-bold text-brand-purple-dark cursor-pointer"
                  style={{ borderColor: on ? c : "transparent", background: mix(c, on ? 22 : 10) }}
                >
                  <Icon name={s.icon} type="solid" className={`text-[11px] ${s.iconClass}`} />
                  <span>{s.name}</span>
                  <b className="font-black" style={{ color: strongOf(c) }}>{counts[s.slug] ?? 0}h</b>
                </button>
              );
            })}
            {lensOn && <span className="text-[12.5px] font-semibold text-neutral-500">Mostrando horários livres de {SPEC[lens].name}</span>}
          </div>

          <div role="grid" aria-label="Padrão semanal" className="flex flex-col gap-[3px] overflow-x-auto">
            <div className={grid}>
              <span />
              {DAY_ABBR.map((d) => <span key={d} className="pt-1 pb-1.5 text-center text-xs font-black tracking-[.05em] text-neutral-500">{d}</span>)}
            </div>
            {HOURS.map((h) => (
              <div key={h} role="row" className={grid}>
                <span className="pt-2 pr-1.5 text-right text-[11.5px] font-bold text-neutral-500 tabular-nums">{hh(h)}</span>
                {WEEKDAYS.map((wd) => cell(wd, h))}
              </div>
            ))}
          </div>
          <p className="m-0 flex items-center gap-[7px] text-[12.5px] font-semibold text-neutral-500"><Icon name="fa-keyboard" /><span>{shiftHint}</span></p>
        </div>

        <aside
          className="min-w-0 sticky top-24 flex flex-col gap-4 rounded-[14px] bg-white border"
          style={{ flex: "1 0 320px", padding: f ? 16 : 0, borderColor: f ? "var(--color-neutral-100)" : "transparent" }}
        >
          {f ? (
            <Editor
              f={f}
              items={items}
              editingId={editingId}
              multi={multi}
              err={err}
              isPref={isPref}
              up={up}
              suggest={suggest}
              onClose={close}
              onSave={save}
              onRemove={remove}
            />
          ) : (
            <div className="flex-1 min-h-80 flex flex-col items-center justify-center gap-3.5 px-5 py-8 border-[1.5px] border-dashed border-neutral-200 rounded-[14px] text-center">
              <span className="w-14 h-14 rounded-full bg-blue-light grid place-items-center text-blue-dark text-[22px]"><Icon name="fa-hand-pointer" /></span>
              <div className="flex flex-col gap-1.5 max-w-60">
                <p className="m-0 text-[15px] font-extrabold text-brand-purple-dark">Nenhum horário selecionado</p>
                <p className="m-0 text-[13px] font-semibold leading-normal text-neutral-500 text-pretty">Clique em um horário vazio para adicionar ou em um agendamento para editar.</p>
              </div>
            </div>
          )}
        </aside>
      </div>
    </div>
  );

  // Só a aba do Padrão de Agenda tem conteúdo nesta tela: as outras não trocam.
  const blockTabs = (e: MouseEvent) => {
    const b = (e.target as HTMLElement).closest?.("[data-tab-button]");
    if (b && b.getAttribute("data-tab-button") !== "agenda_pattern") {
      e.stopPropagation();
      e.preventDefault();
    }
  };

  const splitSteps = (() => {
    const m = state.split;
    if (!m || !m.start || !m.end || m.end < m.start) return [];
    const label: Record<SplitPiece["kind"], (v?: Vigencia) => string> = {
      nova: () => "Novo padrão (propagado na agenda)",
      encerrada: (v) => `${v && v.id === cur.id ? "Padrão atual" : "Padrão anterior"}, encerrado na véspera`,
      retomada: () => "Volta ao padrão anterior",
      adiada: () => "Padrão futuro, adiado",
      substituida: () => "Substituído pelo novo padrão",
    };
    return splitPlan(vigs, m.start, m.end).map((p) => ({
      key: `${p.kind}-${p.start}`,
      label: label[p.kind](p.from),
      range: `${br(p.start)} – ${br(p.end)}`,
      c: p.kind === "nova" ? "var(--color-brand-blue)" : "var(--color-neutral-400)",
      struck: p.kind === "substituida",
    }));
  })();
  const vm = state.vigModal;
  const vmRo = !!vm?.id && vigStatus(vigs.find((v) => v.id === vm.id)!).order === 2;

  return (
    <>
      <div onClickCapture={blockTabs}>
        <PatientLayout context={context} patient={data.patient} activeTab="agenda_pattern" renderTab={(tab) => (tab === "agenda_pattern" ? body : null)} />
      </div>

      {state.dirty && (
        <div className="sticky bottom-0 z-30 flex items-center justify-between gap-4 flex-wrap mt-6 -mx-4 -mb-4 px-4 lg:-mx-8 lg:-mb-8 lg:px-8 py-3.5 bg-white shadow-[0_-2px_12px_rgba(43,35,91,.08)]">
          <p className="m-0 flex items-center gap-2 text-[13.5px] font-bold text-brand-purple-dark">
            <Icon name="fa-pen-to-square" type="solid" className="text-warning-dark" />
            <span>{curSt.order === 0 ? "Padrão de agenda alterado · ao salvar, você define a vigência do novo padrão" : "Padrão alterado"}</span>
          </p>
          <div className="flex items-center gap-2">
            <Button type="button" variant="tint" color="red" onClick={discard}>Descartar alterações</Button>
            <Button type="button" color="blue" rightIcon="fa-save" onClick={commit}>Salvar padrão</Button>
          </div>
        </div>
      )}

      <Modal id="vigencia_novo_padrao" show={!!state.split} title="Vigência do novo padrão" variant="custom" customSize="max-w-[540px]" onCancel={() => set({ split: null, splitErr: "" })}>
        <div className="flex flex-col gap-4">
          <p className="m-0 text-sm font-semibold leading-normal text-neutral-600 text-pretty">
            O padrão em vigência ({range(cur)}) foi alterado. Informe de quando até quando o novo padrão vale para propagarmos na agenda. A vigência que estiver valendo no início é encerrada na véspera.
          </p>
          <div className="grid grid-cols-2 gap-3">
            <Input type="date" id="split_start" label="Início" value={state.split?.start ?? ""} onChange={(e) => set((s) => ({ splitErr: "", split: s.split && { ...s.split, start: val(e) } }))} />
            <Input type="date" id="split_end" label="Término" value={state.split?.end ?? ""} onChange={(e) => set((s) => ({ splitErr: "", split: s.split && { ...s.split, end: val(e) } }))} />
          </div>
          {splitSteps.length > 0 && (
            <div className="flex flex-col gap-2 px-3.5 py-3 rounded-xl bg-neutral-50">
              {splitSteps.map((st) => (
                <div key={st.key} className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2.5 text-[13px] font-semibold text-brand-purple-dark">
                  <i className="w-2.5 h-2.5 rounded-[3px]" style={{ background: st.c }} />
                  <span>{st.label}</span>
                  <b className={`font-extrabold tabular-nums${st.struck ? " line-through text-neutral-500" : ""}`}>{st.range}</b>
                </div>
              ))}
            </div>
          )}
          {state.splitErr && <p className="m-0 text-[13px] font-bold text-red-dark">{state.splitErr}</p>}
          <div className="flex justify-end gap-3">
            <Button type="button" variant="tint" color="red" rightIcon="fa-times" onClick={() => set({ split: null, splitErr: "" })}>Cancelar</Button>
            <Button type="button" color="blue" rightIcon="fa-calendar-check" onClick={confirmSplit}>Salvar e propagar</Button>
          </div>
        </div>
      </Modal>

      <Modal id="vigencia_padrao" show={!!vm} title={vm?.id ? "Vigência do padrão" : "Nova vigência do padrão"} variant="custom" customSize="max-w-[520px]" onCancel={() => set({ vigModal: null, vigErr: "" })}>
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-3">
            <Input type="date" id="vig_start" label="Início" value={vm?.start ?? ""} disabled={vmRo} onChange={(e) => set((s) => ({ vigErr: "", vigModal: s.vigModal && { ...s.vigModal, start: val(e) } }))} />
            <Input type="date" id="vig_end" label="Término" value={vm?.end ?? ""} disabled={vmRo} onChange={(e) => set((s) => ({ vigErr: "", vigModal: s.vigModal && { ...s.vigModal, end: val(e) } }))} />
          </div>
          <SwitchCard
            field={{ id: "vig_auto_renew", name: "hour_map[auto_renew]", value: vm?.autoRenew ?? true }}
            title="Renovação Automática"
            description="Renovar o mapa ao fim da vigência"
            onChange={(e) => set((s) => ({ vigModal: s.vigModal && { ...s.vigModal, autoRenew: e.target.checked } }))}
          />
          {state.vigErr && <p className="m-0 text-[13px] font-bold text-red-dark">{state.vigErr}</p>}
          <p className="m-0 flex gap-2 text-[13px] font-semibold text-neutral-500"><Icon name="fa-circle-info" type="solid" className="mt-0.5" /><span>A vigência não pode se sobrepor a outro padrão de agenda.</span></p>
          <div className="flex justify-end gap-3">
            <Button type="button" variant="tint" color="red" rightIcon="fa-times" onClick={() => set({ vigModal: null, vigErr: "" })}>Cancelar</Button>
            <Button type="button" color="blue" rightIcon="fa-save" disabled={vmRo} onClick={saveVig}>Salvar</Button>
          </div>
        </div>
      </Modal>

      <PlanoTerapeutico show={state.plan} onClose={() => set({ plan: false })} patientName={data.patient.name} unitName={data.patient.unitName} operatorName={data.operator} vigencia={cur} items={items} />
    </>
  );
}

/** O seletor de vigência: o período atual e a lista, da mais nova para a mais antiga. */
function VigenciaPicker({ vigs, cur, onPick, onNew }: { vigs: Vigencia[]; cur: Vigencia; onPick: (v: Vigencia) => void; onNew: () => void }) {
  const st = vigStatus(cur);
  return (
    <Dropdown
      id="vigencia_dropdown"
      placement="bottom-end"
      items={
        <div role="listbox" aria-label="Períodos de vigência" className="min-w-[340px] flex flex-col gap-0.5 p-2">
          {[...vigs].sort((a, b) => b.start.localeCompare(a.start)).map((v) => {
            const on = v.id === cur.id, s = vigStatus(v);
            return (
              <button
                key={v.id}
                type="button"
                role="option"
                aria-selected={on}
                onClick={() => onPick(v)}
                className={[
                  "flex justify-between items-center gap-3 px-4 py-2 rounded-lg font-bold text-left text-brand-purple-dark/60 transition-colors cursor-pointer",
                  on ? "bg-brand-purple-dark/10" : "bg-white hover:bg-brand-purple-dark/5",
                ].join(" ")}
              >
                <span className="flex items-center gap-2.5 tabular-nums">{range(v)}<Tag item={s.label} variant={s.tag} /></span>
                {on && <Icon name="fa-check" />}
              </button>
            );
          })}
          <button type="button" onClick={onNew} className="flex items-center gap-2 mt-1 px-4 py-2 border-t border-neutral-100 font-bold text-brand-blue cursor-pointer hover:bg-brand-purple-dark/5">
            <Icon name="fa-plus" type="solid" />Nova vigência
          </button>
        </div>
      }
    >
      {/* O mesmo campo do `custom_select`: fundo e borda em roxo 10%, azul aberto. */}
      <button
        type="button"
        aria-haspopup="listbox"
        className="group flex items-center justify-between gap-3 h-12 px-4 rounded-lg bg-brand-purple-dark/10 border border-brand-purple-dark/10 [[aria-expanded=true]>&]:border-brand-blue cursor-pointer"
      >
        <span className="flex items-center gap-2.5 font-normal text-brand-purple-dark/80 tabular-nums">{range(cur)}<Tag item={st.label} variant={st.tag} /></span>
        <Icon name="fa-chevron-down" className="text-brand-purple-dark/40 [[aria-expanded=true]>*>&]:text-brand-blue" />
      </button>
    </Dropdown>
  );
}

/** O painel de edição: tipo, serviço, profissional e local do horário selecionado. */
function Editor({ f, items, editingId, multi, err, isPref, up, suggest, onClose, onSave, onRemove }: {
  f: Form;
  items: AgendaItem[];
  editingId?: string;
  multi: boolean;
  err: string;
  isPref: (wd: number, h: number) => boolean;
  up: (patch: Partial<Form>) => void;
  suggest: (slug: SpecSlug, wd: number, h: number, selfId?: string) => string;
  onClose: () => void;
  onSave: () => void;
  onRemove: () => void;
}): ReactNode {
  const slots = !editingId && f.slots ? f.slots : [{ weekday: f.weekday, hour: f.hour }];
  const inPref = isPref(f.weekday, f.hour);
  const aggState = (p: string): { s: ProfState; txt: string } => {
    if (!multi) return profState(p, f.weekday, f.hour, items, editingId);
    const sts = slots.map((s) => profState(p, s.weekday, s.hour, items, null));
    const nFree = sts.filter((s) => s.s === "free").length;
    if (nFree === sts.length) return { s: "free", txt: `Livre nos ${sts.length} horários` };
    const worst = sts.filter((s) => s.s !== "free").sort((a, b) => STATE_ORDER[b.s] - STATE_ORDER[a.s])[0]!;
    return { s: worst.s, txt: `Livre em ${nFree} de ${sts.length} horários` };
  };
  const list = PROFS[f.slug].map((p) => ({ p, st: aggState(p) }));
  list.sort((a, b) => (a.p === f.professional ? -1 : b.p === f.professional ? 1 : STATE_ORDER[a.st.s] - STATE_ORDER[b.st.s]));
  const profOpts: SelectItem[] = [
    { group: "Livres", items: list.filter(({ st }) => st.s === "free").map(({ p, st }) => ({ label: multi ? `${p} · ${st.txt}` : p, value: p })) },
    { group: "Indisponíveis", items: list.filter(({ st }) => st.s !== "free").map(({ p, st }) => ({ label: `${p} · ${st.txt}`, value: p })) },
  ].filter((g) => g.items.length);
  const serviceOpts: SelectItem[] = SPECS.map((s) => ({ group: s.name, items: SERVICES[s.slug].map((sv) => ({ label: sv, value: `${s.slug}|${sv}` })) }));
  const prefNote = multi
    ? `${slots.filter((s) => isPref(s.weekday, s.hour)).length} de ${slots.length} em horário preferencial da família`
    : inPref ? "Horário preferencial da família" : "Fora dos horários preferenciais da família";

  const setService = (v: string | null) => {
    if (!v) return up({ service: "" });
    const [slug, service] = v.split("|") as [SpecSlug, string];
    if (slug === f.slug) return up({ service });
    up({ slug, service, professional: suggest(slug, f.weekday, f.hour, editingId) });
  };

  return (
    <div className="flex flex-col gap-3.5">
      <div className="flex items-center justify-between">
        <p className="m-0 text-[15px] font-extrabold text-brand-purple-dark">
          {editingId ? "Editar agendamento" : multi ? `Novos agendamentos · ${slots.length} horários` : "Novo agendamento"}
        </p>
        <Button type="button" variant="ghost" size="medium" aria-label="Fechar edição" onClick={onClose}><Icon name="fa-xmark" type="solid" /></Button>
      </div>
      <RadioSelector
        className="flex [&>label]:flex-1 [&>label]:justify-center"
        field={{ id: "f_type", name: "agenda[type]", value: f.type }}
        radio={[{ value: "patient", label: "Paciente" }, { value: "at", label: "AT" }]}
        onChange={(e) => up({ type: e.target.value as Form["type"] })}
      />
      <p className="m-0 flex items-center gap-[7px] text-[12.5px] font-bold" style={{ color: inPref ? "var(--color-yellow-dark)" : "var(--color-neutral-500)" }}>
        <Icon name="fa-star" type={inPref ? "solid" : "regular"} className="text-warning-dark" /><span>{prefNote}</span>
      </p>
      <Input type="select" id="f_service" label="Serviço" prompt="Selecione um serviço" options={serviceOpts} value={f.service ? `${f.slug}|${f.service}` : ""} clear={false} onChange={setService} />
      <Input type="select" id="f_prof" label="Profissional" prompt="Selecione um profissional" options={profOpts} value={f.professional} clear={false} onChange={(v) => up({ professional: v ?? "" })} />
      <Input type="select" id="f_loc" label="Local" prompt="Selecione um local" options={LOCATIONS} value={f.location} clear={false} onChange={(v) => v && up({ location: v })} />
      {err && (
        <p className="m-0 flex items-center gap-2 text-[13px] font-bold text-red-dark">
          <Icon name="fa-triangle-exclamation" type="solid" className="text-red" /><span>{err}</span>
        </p>
      )}
      <div className="flex items-center justify-end gap-2 pt-1">
        {editingId && (
          <>
            <Button type="button" variant="tint" color="red" onClick={onRemove}>Remover</Button>
            <span className="flex-1" />
          </>
        )}
        {!editingId && <Button type="button" variant="tint" onClick={onClose}>Cancelar</Button>}
        <Button type="button" color="blue" onClick={onSave}>{editingId ? "Salvar" : multi ? `Adicionar ${slots.length}` : "Adicionar"}</Button>
      </div>
    </div>
  );
}
