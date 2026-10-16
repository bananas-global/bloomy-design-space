/**
 * CRM de Leads — Disponibilidade da família, na aba Negócio.
 * Novo — não existe no Phoenix (o modal de Leads tem as linhas dia, das, até).
 *
 * Os horários em que a criança pode vir à clínica, marcados na mesma grade de
 * dias × horas da Agenda anterior e da Proposta de grade, onde aparecem como a
 * estrela do horário preferencial. A equipe pinta direto no cartão (clicar e
 * arrastar) e salva. A agenda anterior fica ao fundo, só como referência do
 * que a criança faz hoje em outra clínica: não marca nem desmarca nada. O dado continua em faixas por dia
 * (`availabilities[weekday, from, to]`).
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "../../components/Button.js";
import { Icon } from "../../components/Icon.js";
import type { Availability, Lead, WeekBlock } from "./model.js";
import type { Up } from "./NegocioTab.js";
import { byFamily } from "./FamilyRequest.js";
import { Section, cx } from "./parts.js";
import { DAYS, DAY_ABBR, DAY_SHORT, HOURS, hh, isPref, mix, shortOf, strongOf, toAvailability, tone } from "./week.js";

const key = (wd: number, h: number) => `${wd}-${h}`;
const PAINT = mix("var(--color-yellow)", 30);
const EMPTY = "rgba(43,35,91,.035)";

/** As faixas como células de uma hora. Faixa quebrada (08:30) entra só nas horas inteiras. */
const toCells = (av: Availability[]) => new Set(DAYS.flatMap((wd) => HOURS.filter((h) => isPref(av, wd, h)).map((h) => key(wd, h))));
const toBlocks = (cells: Set<string>): WeekBlock[] =>
  [...cells].map((k) => { const [wd, h] = k.split("-").map(Number); return { id: k, weekday: wd!, hour: h!, spec: "" }; });

export function Disponibilidade({ lead, up }: { lead: Lead; up: Up }) {
  const saved = useMemo(() => toCells(lead.availability), [lead.availability]);
  /** A edição em curso; `null` enquanto ninguém pintou. */
  const [draft, setDraft] = useState<Set<string> | null>(null);
  const drag = useRef<boolean | null>(null);
  const cells = draft ?? saved;
  const prev = lead.currentWeek?.blocks ?? [];
  const busy = (wd: number, h: number) => prev.find((b) => b.weekday === wd && b.hour === h);

  useEffect(() => {
    const stop = () => { drag.current = null; };
    window.addEventListener("mouseup", stop);
    return () => window.removeEventListener("mouseup", stop);
  }, []);

  const paint = (ks: string[], on: boolean) => setDraft((d) => { const n = new Set(d ?? saved); ks.forEach((k) => (on ? n.add(k) : n.delete(k))); return n; });
  /** Dia ou hora inteiros: liga tudo, ou desliga se já estava tudo ligado. */
  const toggleAll = (ks: string[]) => paint(ks, !ks.every((k) => cells.has(k)));
  const save = () => { if (draft) up({ availability: toAvailability(toBlocks(draft)) }); setDraft(null); };

  const gridCls = "grid grid-cols-[48px_repeat(6,minmax(0,1fr))] gap-[3px]";
  const headBtn = "cursor-pointer rounded-md border-0 bg-transparent text-neutral-500 hover:bg-brand-purple-dark/5 hover:text-brand-purple-dark";

  return (
    <Section
      anchor="disp"
      title="Disponibilidade da família"
      desc="Quando a criança pode vir à clínica. Marque todos os horários possíveis, não só os preferidos."
      tag={cells.size ? `${cells.size}h por semana` : null}
      fam={byFamily(lead, "disp")}
    >
      <div role="grid" aria-label="Disponibilidade da família" className="flex select-none flex-col gap-[3px] overflow-x-auto">
        <div className={gridCls}>
          <span />
          {DAYS.map((wd) => (
            <button key={wd} type="button" title={`Marcar ou desmarcar ${DAY_SHORT[wd - 1]} inteira`} onClick={() => toggleAll(HOURS.map((h) => key(wd, h)))} className={cx(headBtn, "pb-1 text-xs font-black tracking-[.05em]")}>
              {DAY_ABBR[wd - 1]}
            </button>
          ))}
        </div>
        {HOURS.map((h) => (
          <div key={h} role="row" className={gridCls}>
            <button type="button" title={`Marcar ou desmarcar ${hh(h)} em todos os dias`} onClick={() => toggleAll(DAYS.map((wd) => key(wd, h)))} className={cx(headBtn, "pr-1.5 text-right text-[11px] font-bold tabular-nums")}>
              {hh(h)}
            </button>
            {DAYS.map((wd) => {
              const k = key(wd, h);
              const on = cells.has(k);
              const b = busy(wd, h);
              return (
                <div
                  key={wd}
                  role="gridcell"
                  tabIndex={0}
                  aria-selected={on}
                  title={`${DAY_SHORT[wd - 1]} ${hh(h)}–${hh(h + 1)}${b ? ` · na outra clínica: ${b.spec}` : ""}`}
                  onMouseDown={(e) => { e.preventDefault(); drag.current = !on; paint([k], !on); }}
                  onMouseEnter={() => { if (drag.current !== null) paint([k], drag.current); }}
                  onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); paint([k], !on); } }}
                  className="relative flex h-7 cursor-pointer items-center gap-1 rounded-md px-2 outline-none transition-[background] duration-100 hover:brightness-[.97] focus-visible:ring-2 focus-visible:ring-brand-blue"
                  style={{ background: on ? PAINT : EMPTY }}
                >
                  {b && (
                    <span className="flex min-w-0 items-center gap-1 opacity-60">
                      <b className="text-[10.5px] font-black" style={{ color: strongOf(tone(b.spec)) }}>{shortOf(b.spec)}</b>
                      <span className="truncate text-[10.5px] font-semibold text-brand-purple-dark/70">outra clínica</span>
                    </span>
                  )}
                  {on && <Icon name="fa-star" type="solid" className="absolute right-[7px] top-1/2 -translate-y-1/2 text-[9px] leading-none text-warning-dark" />}
                </div>
              );
            })}
          </div>
        ))}
      </div>

      {draft ? (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="m-0 text-sm font-semibold text-brand-purple-dark/60">Alterações não salvas.</p>
          <div className="flex flex-wrap gap-2">
            {draft.size > 0 && <Button type="button" variant="tint" color="red" rightIcon="fa-eraser" onClick={() => setDraft(new Set())}>Limpar tudo</Button>}
            <Button type="button" variant="tint" rightIcon="fa-xmark" onClick={() => setDraft(null)}>Descartar</Button>
            <Button type="button" rightIcon="fa-check" onClick={save}>Salvar disponibilidade</Button>
          </div>
        </div>
      ) : (
        <p className="m-0 flex flex-wrap items-center gap-x-4 gap-y-1 text-[12.5px] font-semibold text-neutral-500">
          <span className="flex items-center gap-[7px]"><Icon name="fa-hand-pointer" /><span>Clique e arraste para marcar ou desmarcar</span></span>
          <span className="flex items-center gap-[7px]"><Icon name="fa-calendar-day" /><span>Clique no dia ou na hora para marcar a linha inteira</span></span>
        </p>
      )}
    </Section>
  );
}
