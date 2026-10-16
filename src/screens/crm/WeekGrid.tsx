/**
 * CRM de Leads — a grade semanal da Agenda anterior e da Proposta de grade.
 * Novo — não existe no Phoenix (componente novo para o dev).
 *
 * A mesma estrutura do Padrão de Agenda (`PadraoAgenda.tsx`, branch
 * `novo-padrao-de-agenda`): dias × horas, um horário por célula com a sigla e
 * a cor da especialidade, a estrela do horário preferencial da família, as
 * pílulas de especialidade que mostram os profissionais livres, Shift + clique
 * para marcar vários horários e o painel de edição ao lado.
 */
import { useState, type CSSProperties, type KeyboardEvent, type MouseEvent, type ReactNode } from "react";
import { Button } from "../../components/Button.js";
import { Icon } from "../../components/Icon.js";
import { Input, type SelectItem } from "../../components/Input.js";
import type { Availability, WeekBlock } from "./model.js";
import {
  DAYS, DAY_ABBR, DAY_SHORT, HOURS, SPEC_NAMES, STATE_ORDER, first, hh, iconOf, isPref, mix, newId, profState, profsOf, shortOf, strongOf, tone,
  type ProfState,
} from "./week.js";

type Slot = { weekday: number; hour: number };
export type WeekForm = { id?: string; slots: Slot[]; spec: string; professional: string };

const val = (v: string | null | undefined) => v ?? "";

/**
 * O estado da edição: o horário (ou os horários, com Shift) selecionado e o
 * formulário do painel. Com `unit`, cada horário pede profissional, sugerido
 * entre os livres.
 */
export function useWeekEditor({ blocks, setBlocks, unit, defaultSpec, lens }: {
  blocks: WeekBlock[];
  setBlocks: (b: WeekBlock[]) => void;
  unit?: string;
  defaultSpec: string;
  lens?: string;
}) {
  const [f, setF] = useState<WeekForm | null>(null);
  const [err, setErr] = useState("");
  const [lastSpec, setLastSpec] = useState(defaultSpec);
  const editing = f?.id;
  const multi = !editing && !!f && f.slots.length > 1;
  const sugg = (spec: string, s: Slot, self?: string) => (unit ? profsOf(unit, spec).find((p) => profState(p, s.weekday, s.hour, blocks, self).s === "free") ?? "" : "");

  const up = (patch: Partial<WeekForm>) => { setErr(""); setF((x) => x && { ...x, ...patch }); };
  const close = () => { setF(null); setErr(""); };

  function openCell(wd: number, h: number, e?: { shiftKey: boolean }) {
    const taken = blocks.find((b) => b.weekday === wd && b.hour === h);
    if (e?.shiftKey && f && !editing) {
      if (taken) return;
      const has = f.slots.some((s) => s.weekday === wd && s.hour === h);
      if (has && f.slots.length === 1) return;
      const slots = has ? f.slots.filter((s) => !(s.weekday === wd && s.hour === h)) : [...f.slots, { weekday: wd, hour: h }].sort((a, b) => a.weekday - b.weekday || a.hour - b.hour);
      return up({ slots });
    }
    if (taken) return openBlock(taken);
    const spec = lens || lastSpec;
    setErr("");
    setF({ slots: [{ weekday: wd, hour: h }], spec, professional: sugg(spec, { weekday: wd, hour: h }) });
  }

  function openBlock(b: WeekBlock) {
    setErr("");
    setF({ id: b.id, slots: [{ weekday: b.weekday, hour: b.hour }], spec: b.spec, professional: b.professional ?? "" });
  }

  function setSpec(spec: string) {
    if (!f) return;
    up({ spec, professional: unit ? sugg(spec, f.slots[0]!, editing) : "" });
  }

  function save() {
    if (!f) return;
    if (unit && f.professional) {
      const orig = editing ? blocks.find((b) => b.id === editing) : undefined;
      const bad = f.slots.find((s) => !(orig && orig.professional === f.professional) && profState(f.professional, s.weekday, s.hour, blocks, editing).s !== "free");
      if (bad) return setErr(`${first(f.professional)} não está livre em ${DAY_SHORT[bad.weekday - 1]} ${hh(bad.hour)}.`);
    }
    const prof = unit ? { professional: f.professional } : {};
    if (editing) setBlocks(blocks.map((b) => (b.id === editing ? { ...b, spec: f.spec, ...prof } : b)));
    else setBlocks([...blocks, ...f.slots.map((s): WeekBlock => ({ id: newId(), weekday: s.weekday, hour: s.hour, spec: f.spec, ...prof }))]);
    setLastSpec(f.spec);
    close();
  }

  const remove = () => { setBlocks(blocks.filter((b) => b.id !== editing)); close(); };

  return { f, err, editing, multi, up, close, save, remove, setSpec, openCell, openBlock };
}

type Editor = ReturnType<typeof useWeekEditor>;

/** A grade: dias × horas, com os horários e, com `lens`, quantos profissionais estão livres. */
export function WeekGrid({ blocks, editor, availability, lens, freeCount, label }: {
  blocks: WeekBlock[];
  editor: Editor;
  availability: Availability[];
  lens?: string;
  freeCount?: (wd: number, h: number) => number;
  label: string;
}) {
  const { f, editing } = editor;
  const lensOn = !!lens && !!freeCount;
  const lensPill = lensOn ? mix(tone(lens!), 70, "var(--color-brand-purple-dark)") : "var(--color-neutral-500)";
  const pill = (bg: string): CSSProperties => ({ background: bg });
  const grid = "grid grid-cols-[52px_repeat(6,minmax(84px,1fr))] gap-[3px]";

  const cell = (wd: number, h: number) => {
    const pref = isPref(availability, wd, h);
    const ghost = !!(f && !editing && f.slots.some((s) => s.weekday === wd && s.hour === h));
    const n = lensOn ? freeCount!(wd, h) : 0;
    const nTxt = n ? `${n} livre${n > 1 ? "s" : ""}` : "0 livres";
    const it = blocks.find((b) => b.weekday === wd && b.hour === h);
    const ring = it && it.id === editing ? "inset 0 0 0 2px var(--color-brand-blue)" : "none";
    const hatch = "repeating-linear-gradient(135deg, rgba(43,35,91,.035) 0 6px, rgba(43,35,91,.09) 6px 8px)";
    const empty = lensOn ? (n ? "rgba(43,35,91,.035)" : hatch) : ghost ? "rgba(88,186,218,.14)" : "rgba(43,35,91,.035)";
    const bg = it ? (lensOn && !n ? `repeating-linear-gradient(135deg, transparent 0 6px, rgba(43,35,91,.09) 6px 8px), ${mix(tone(it.spec), 16)}` : mix(tone(it.spec), 16)) : empty;
    const title = [pref && "Horário preferencial da família", lensOn ? `${n} profissional(is) livre(s) de ${lens}` : "Clique para adicionar"].filter(Boolean).join(" · ");

    return (
      <div
        key={wd}
        role="gridcell"
        tabIndex={0}
        title={title}
        onMouseDown={(e) => { if (e.shiftKey) e.preventDefault(); }}
        onClick={(e) => editor.openCell(wd, h, e)}
        onKeyDown={(e: KeyboardEvent) => { if (e.key === "Enter" && e.target === e.currentTarget) { e.preventDefault(); editor.openCell(wd, h); } }}
        className="relative flex min-h-10 cursor-pointer flex-col gap-[3px] rounded-lg outline-none transition-[background] duration-150 hover:brightness-[.97]"
        style={{ padding: `3px ${pref || lensOn ? 20 : 3}px 3px 3px`, background: bg, boxShadow: ring }}
      >
        {pref && <Icon name="fa-star" type="solid" className="absolute right-[7px] top-1/2 -translate-y-1/2 text-[10px] leading-none text-warning-dark" />}
        {lensOn && n > 0 && !it && (
          <span className="pointer-events-none mx-1 my-auto self-end rounded-full px-[7px] py-px text-[10.5px] font-bold leading-[1.5] text-white" style={pill(lensPill)}>{nTxt}</span>
        )}
        {it && (
          <button
            type="button"
            title={`${it.spec}${it.professional !== undefined ? ` · ${it.professional || "sem profissional"}` : ""}`}
            onClick={(e: MouseEvent) => { e.stopPropagation(); if (e.shiftKey && f && !editing) return; editor.openBlock(it); }}
            className="flex min-h-0 w-full flex-1 cursor-pointer items-center gap-1.5 overflow-hidden border-0 bg-transparent px-1 text-left"
          >
            <span className="flex min-w-0 items-center gap-1.5" style={{ opacity: lensOn && editing !== it.id ? 0.8 : 1 }}>
              <b className="text-[11.5px] font-black" style={{ color: strongOf(tone(it.spec)) }}>{shortOf(it.spec)}</b>
              <span className="min-w-0 overflow-hidden text-ellipsis whitespace-nowrap text-[11.5px] font-bold text-brand-purple-dark">
                {it.professional === undefined ? it.spec : it.professional ? first(it.professional) : "Sem prof."}
              </span>
            </span>
            <span className="flex-1" />
            {lensOn && n > 0 && <span className="flex-none rounded-full px-[7px] py-px text-[10.5px] font-bold leading-[1.5] text-white" style={pill(lensPill)}>{nTxt}</span>}
          </button>
        )}
        {ghost && <span className="pointer-events-none absolute inset-0 rounded-lg border-[2.5px] border-dashed border-brand-blue" />}
      </div>
    );
  };

  return (
    <div className="flex flex-col gap-3">
      <div role="grid" aria-label={label} className="flex flex-col gap-[3px] overflow-x-auto">
        <div className={grid}>
          <span />
          {DAY_ABBR.map((d) => <span key={d} className="pb-1.5 pt-1 text-center text-xs font-black tracking-[.05em] text-neutral-500">{d}</span>)}
        </div>
        {HOURS.map((h) => (
          <div key={h} role="row" className={grid}>
            <span className="pr-1.5 pt-2 text-right text-[11.5px] font-bold tabular-nums text-neutral-500">{hh(h)}</span>
            {DAYS.map((wd) => cell(wd, h))}
          </div>
        ))}
      </div>
      <p className="m-0 flex flex-wrap items-center gap-x-4 gap-y-1 text-[12.5px] font-semibold text-neutral-500">
        <span className="flex items-center gap-[7px]"><Icon name="fa-keyboard" /><span>{editor.multi ? "Shift + clique em um horário selecionado para removê-lo" : "Segure Shift e clique para selecionar mais horários"}</span></span>
        <span className="flex items-center gap-[7px]"><Icon name="fa-star" type="solid" className="text-warning-dark" /><span>Disponibilidade da família</span></span>
      </p>
    </div>
  );
}

/**
 * As pílulas de especialidade com as horas de cada uma. Com `onLens`, clicar
 * mostra os horários livres dos profissionais da especialidade.
 */
export function SpecPills({ blocks, lens, onLens }: { blocks: WeekBlock[]; lens?: string; onLens?: (spec: string) => void }) {
  const counts: Record<string, number> = {};
  blocks.forEach((b) => { counts[b.spec] = (counts[b.spec] ?? 0) + 1; });
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {SPEC_NAMES.map((s) => {
        const on = lens === s;
        const c = tone(s);
        const st = iconOf(s);
        const body = (
          <>
            <Icon name={st.icon} type="solid" className={`text-[11px] ${st.iconClass}`} />
            <span>{s}</span>
            <b className="font-black" style={{ color: strongOf(c) }}>{counts[s] ?? 0}h</b>
          </>
        );
        const cls = "inline-flex items-center gap-[7px] rounded-lg border px-[9px] py-1 text-[12.5px] font-bold text-brand-purple-dark";
        const style = { borderColor: on ? c : "transparent", background: mix(c, on ? 22 : 10) };
        return onLens ? (
          <button key={s} type="button" aria-pressed={on} title={on ? "Clique para limpar o filtro" : `Ver horários livres de ${s}`} onClick={() => onLens(on ? "" : s)} className={`${cls} cursor-pointer`} style={style}>{body}</button>
        ) : (
          <span key={s} className={cls} style={style}>{body}</span>
        );
      })}
      {lens && onLens && <span className="text-[12.5px] font-semibold text-neutral-500">Mostrando horários livres de {lens}</span>}
    </div>
  );
}

/** O painel de edição do horário selecionado: especialidade e, na proposta, o profissional. */
export function BlockEditor({ editor, blocks, availability, unit }: { editor: Editor; blocks: WeekBlock[]; availability: Availability[]; unit?: string }) {
  const { f, err, editing, multi } = editor;
  if (!f) {
    return (
      <div className="flex min-h-64 flex-col items-center justify-center gap-3.5 rounded-[14px] border-[1.5px] border-dashed border-neutral-200 px-5 py-8 text-center">
        <span className="grid h-14 w-14 place-items-center rounded-full bg-blue-light text-[22px] text-blue-dark"><Icon name="fa-hand-pointer" /></span>
        <div className="flex max-w-60 flex-col gap-1.5">
          <p className="m-0 text-[15px] font-extrabold text-brand-purple-dark">Nenhum horário selecionado</p>
          <p className="m-0 text-pretty text-[13px] font-semibold leading-normal text-neutral-500">Clique em um horário vazio para adicionar ou em um horário registrado para editar.</p>
        </div>
      </div>
    );
  }
  const slots = f.slots;
  const s0 = slots[0]!;
  const inPref = isPref(availability, s0.weekday, s0.hour);
  const prefNote = multi
    ? `${slots.filter((s) => isPref(availability, s.weekday, s.hour)).length} de ${slots.length} na disponibilidade da família`
    : inPref ? "Na disponibilidade da família" : "Fora da disponibilidade da família";
  const where = multi ? `${slots.length} horários` : `${DAY_SHORT[s0.weekday - 1]} ${hh(s0.hour)}–${hh(s0.hour + 1)}`;

  let profOpts: SelectItem[] = [];
  if (unit) {
    const aggState = (p: string): { s: ProfState; txt: string } => {
      if (!multi) return profState(p, s0.weekday, s0.hour, blocks, editing);
      const sts = slots.map((s) => profState(p, s.weekday, s.hour, blocks, null));
      const nFree = sts.filter((s) => s.s === "free").length;
      if (nFree === sts.length) return { s: "free", txt: `Livre nos ${sts.length} horários` };
      const worst = sts.filter((s) => s.s !== "free").sort((a, b) => STATE_ORDER[b.s] - STATE_ORDER[a.s])[0]!;
      return { s: worst.s, txt: `Livre em ${nFree} de ${sts.length} horários` };
    };
    const list = profsOf(unit, f.spec).map((p) => ({ p, st: aggState(p) }));
    list.sort((a, b) => (a.p === f.professional ? -1 : b.p === f.professional ? 1 : STATE_ORDER[a.st.s] - STATE_ORDER[b.st.s]));
    profOpts = [
      { group: "Livres", items: list.filter(({ st }) => st.s === "free").map(({ p, st }) => ({ label: multi ? `${p} · ${st.txt}` : p, value: p })) },
      { group: "Indisponíveis", items: list.filter(({ st }) => st.s !== "free").map(({ p, st }) => ({ label: `${p} · ${st.txt}`, value: p })) },
    ].filter((g) => g.items.length);
  }

  return (
    <div className="flex flex-col gap-3.5 rounded-[14px] border border-neutral-100 bg-white p-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="m-0 text-[15px] font-extrabold text-brand-purple-dark">{editing ? "Editar horário" : multi ? `Novos horários · ${slots.length}` : "Novo horário"}</p>
          <p className="m-0 text-[12.5px] font-semibold text-neutral-500">{where}</p>
        </div>
        <Button type="button" variant="ghost" size="medium" aria-label="Fechar edição" onClick={editor.close}><Icon name="fa-xmark" type="solid" /></Button>
      </div>
      <p className="m-0 flex items-center gap-[7px] text-[12.5px] font-bold" style={{ color: inPref ? "var(--color-yellow-dark)" : "var(--color-neutral-500)" }}>
        <Icon name="fa-star" type={inPref ? "solid" : "regular"} className="text-warning-dark" /><span>{prefNote}</span>
      </p>
      <Input type="select" id="week_spec" label="Especialidade" options={SPEC_NAMES.map((s) => [s, s] as const)} value={f.spec} clear={false} onChange={(v) => v && editor.setSpec(v)} />
      {unit && (
        <Input
          type="select"
          id="week_prof"
          label="Profissional"
          prompt={profOpts.length ? "Sem profissional" : `Ninguém de ${f.spec} em ${unit}`}
          options={profOpts}
          value={f.professional}
          onChange={(v) => editor.up({ professional: val(v) })}
        />
      )}
      {err && (
        <p className="m-0 flex items-center gap-2 text-[13px] font-bold text-red-dark">
          <Icon name="fa-triangle-exclamation" type="solid" className="text-red" /><span>{err}</span>
        </p>
      )}
      <div className="flex items-center justify-end gap-2 pt-1">
        {editing && (
          <>
            <Button type="button" variant="tint" color="red" onClick={editor.remove}>Remover</Button>
            <span className="flex-1" />
          </>
        )}
        {!editing && <Button type="button" variant="tint" onClick={editor.close}>Cancelar</Button>}
        <Button type="button" onClick={editor.save}>{editing ? "Salvar" : multi ? `Adicionar ${slots.length}` : "Adicionar"}</Button>
      </div>
    </div>
  );
}

/** A grade à esquerda e o painel à direita, como no Padrão de Agenda. */
export function WeekLayout({ children, aside }: { children: ReactNode; aside: ReactNode }) {
  return (
    <div className="flex flex-wrap items-start gap-6">
      <div className="flex min-w-0 flex-col gap-3" style={{ flex: "999 1 580px" }}>{children}</div>
      <aside className="flex min-w-0 flex-col gap-4" style={{ flex: "1 0 300px" }}>{aside}</aside>
    </div>
  );
}

/** As horas por especialidade, com a meta pedida ao lado quando houver. */
export function HoursSummary({ rows, title }: { rows: { spec: string; got: number; need?: number }[]; title: string }) {
  const total = rows.reduce((s, r) => s + r.got, 0);
  return (
    <div className="flex flex-col gap-2 rounded-xl bg-neutral-50 px-3.5 py-3">
      <p className="m-0 text-xs font-bold uppercase tracking-widest text-brand-purple-dark/60">{title}</p>
      {rows.length === 0 ? (
        <p className="m-0 text-[13px] font-semibold text-neutral-500">Nenhum horário registrado.</p>
      ) : (
        <ul className="m-0 flex list-none flex-col gap-1.5 p-0">
          {rows.map((r) => {
            const short = r.need !== undefined && r.got < r.need;
            return (
              <li key={r.spec} className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2.5 text-[13px] font-semibold text-brand-purple-dark">
                <i className="h-2.5 w-2.5 rounded-[3px]" style={{ background: tone(r.spec) }} />
                <span className="truncate">{r.spec}</span>
                <b className={`font-extrabold tabular-nums ${short ? "text-orange-dark" : ""}`}>{r.got}h{r.need !== undefined ? ` / ${r.need}h` : ""}</b>
              </li>
            );
          })}
          <li className="grid grid-cols-[minmax(0,1fr)_auto] gap-2.5 border-t border-neutral-200 pt-1.5 text-[13px] font-extrabold text-brand-purple-dark">
            <span>Total</span><b className="tabular-nums">{total}h</b>
          </li>
        </ul>
      )}
    </div>
  );
}
