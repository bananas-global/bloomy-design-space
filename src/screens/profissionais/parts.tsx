/**
 * Profissionais — peças locais da feature.
 * Novo — não existe no Phoenix: cada peça abaixo é da tela, montada sobre
 * componentes do catálogo e com tokens do monólito.
 */
import type { ReactNode } from "react";
import { Tooltip } from "../../components/Choice.js";
import { Icon } from "../../components/Icon.js";
import { Input } from "../../components/Input.js";
import { StatusTag, Tag } from "../../components/Tag.js";
import { DOC_STATES, isoToBr, PROF_STATUS, STATE_ORDER, daysBetween, type DocState, type Professional, type ProfStatus, type StateCounts } from "./model.js";

function cx(...classes: (string | false | null | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}

/* ---------- seletor de visão ---------- */

export type ViewOption<V extends string> = { id: V; label: string; icon: string; badge?: number };

/**
 * Cadastro / Documentação / Controle de horas. É o desenho do `button_tabs`
 * com ícone e contador, que o componente não tem: por isso é da tela.
 */
export function ViewToggle<V extends string>({ options, value, onChange }: { options: ViewOption<V>[]; value: V; onChange: (v: V) => void }) {
  return (
    <div role="group" aria-label="Visão de profissionais" className="inline-flex gap-0.5 rounded-[10px] bg-brand-purple-dark/6 p-[3px]">
      {options.map((o) => {
        const on = o.id === value;
        return (
          <button
            key={o.id}
            type="button"
            aria-pressed={on}
            onClick={() => onChange(o.id)}
            className={cx(
              "inline-flex cursor-pointer items-center gap-1.5 rounded-lg px-3 py-1.5 text-[12.5px] font-bold transition-all duration-200 ease-in-out",
              on ? "bg-white text-brand-purple-dark shadow-main" : "text-brand-purple-dark/60 hover:text-brand-purple-dark",
            )}
          >
            <Icon name={o.icon} type="solid" className="text-[11px]" />
            {o.label}
            {o.badge != null && o.badge > 0 && (
              <span className="inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-red px-1.5 text-[10.5px] font-extrabold text-white">
                {o.badge}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

/* ---------- filtros ---------- */

/** Busca por texto: `input`. */
export function SearchFilter({ id, label, placeholder, value, onChange }: { id: string; label: string; placeholder: string; value: string; onChange: (v: string) => void }) {
  return <Input id={id} name={id} label={label} placeholder={placeholder} value={value} onChange={(e) => onChange(e.target.value)} />;
}

/** Um filtro de lista: `input type="select"`; o `prompt` é o valor vazio, sem filtro. */
export function SelectFilter({
  id,
  label,
  prompt,
  options,
  value,
  onChange,
}: {
  id: string;
  label: string;
  prompt?: string;
  options: readonly (readonly [string, string])[];
  value: string;
  onChange: (v: string) => void;
}) {
  // Sem `prompt` não há valor vazio: sem o botão de limpar.
  return <Input type="select" id={id} name={id} label={label} prompt={prompt} clear={prompt != null} options={options} value={value} onChange={(v) => onChange(v ?? "")} />;
}

/* ---------- célula do nome ---------- */

/** O ponto de status, o nome (com TBD) e, embaixo, a situação de quem sai ou saiu. */
export function NameCell({ prof, status, today }: { prof: Professional; status: ProfStatus; today: string }) {
  const days = status === "deactivating" ? daysBetween(today, prof.deactivationAt!) : null;
  return (
    <div className="flex items-center gap-2.5 font-semibold text-brand-purple-dark">
      <StatusTag
        status={prof.active}
        title={PROF_STATUS[status].label}
        className={cx("flex-none", PROF_STATUS[status].dot, status === "deactivating" && "ring-[3px] ring-orange/20")}
      />
      <div className="flex min-w-0 flex-col gap-0.5">
        <span className="inline-flex items-center gap-2 whitespace-nowrap">
          {prof.name}
          {prof.tbd && <Tag item="TBD" variant="yellow" />}
        </span>
        {status === "deactivating" && (
          <span className="inline-flex items-center gap-[5px] text-[11.5px] font-bold whitespace-nowrap text-orange-dark">
            <Icon name="fa-arrow-right-from-bracket" type="solid" className="text-[10px]" />
            Em inativação · sai {isoToBr(prof.deactivationAt!)} · {days} dia{days! > 1 ? "s" : ""}
          </span>
        )}
        {status === "inativo" && <span className="text-[11.5px] font-bold text-brand-purple-dark/50">Inativo</span>}
      </div>
    </div>
  );
}

/* ---------- matriz de documentação ---------- */

/** As cores de cada estado, em tokens do monólito. */
export const STATE_TONE: Record<DocState, string> = {
  ok: "bg-brand-green/18 text-brand-green-dark",
  expiring: "bg-brand-orange/24 text-orange-dark",
  expired: "bg-brand-red/16 text-brand-red-dark",
  missing: "bg-brand-purple-dark/7 text-brand-purple-dark/40",
  waived: "bg-neutral-600/14 text-neutral-600",
};

const PIP = "inline-flex min-w-[22px] items-center justify-center gap-[3px] whitespace-nowrap rounded px-2 py-0.5 text-sm font-semibold tabular-nums";

/** Uma célula da matriz: o ícone do estado e, às vezes, um rótulo (horas, faltas). */
export function CellBox({ state, label, title, onClick }: { state: DocState; label?: string | null; title: string; onClick: () => void }) {
  const st = DOC_STATES[state];
  return (
    <button type="button" title={title} onClick={onClick} className={cx(PIP, STATE_TONE[state], "cursor-pointer transition-transform duration-150 ease-in-out hover:scale-110")}>
      {!(label && state === "missing") && <Icon name={st.icon} type="solid" className="text-[11px]" />}
      {label && <span className="text-[10px]">{label}</span>}
    </button>
  );
}

/** Resumo de uma categoria na visão geral: quantos em cada estado, ou "em dia". */
export function Rollup({ id, counts, total, onClick }: { id: string; counts: StateCounts; total: number; onClick: () => void }) {
  const present = STATE_ORDER.filter((k) => counts[k]);
  const clean = !counts.expired && !counts.missing && !counts.expiring;
  const allWaived = counts.waived === total;
  const breakdown = present.map((k) => `${counts[k]} ${DOC_STATES[k].label.toLowerCase()}`).join(" · ");

  const pip = (key: string, tone: string, tip: string, children: ReactNode) => (
    <Tooltip
      key={key}
      id={`${id}-${key}`}
      placement="top"
      tooltipClass="rounded-lg bg-brand-purple-dark px-2.5 py-1.5 text-[11.5px] font-bold whitespace-nowrap text-white shadow-main"
      tooltipTrigger={<span className={cx(PIP, tone)}>{children}</span>}
      tooltipContent={tip}
    />
  );

  return (
    <button type="button" onClick={onClick} className="flex w-full min-w-[104px] cursor-pointer items-center justify-center gap-[5px] px-0.5 py-1 hover:brightness-95">
      {clean
        ? pip(
            "clean",
            allWaived ? STATE_TONE.waived : STATE_TONE.ok,
            breakdown,
            <>
              <Icon name={allWaived ? "fa-ban" : "fa-check"} type="solid" />
              {allWaived ? "dispensada" : "em dia"}
            </>,
          )
        : present.map((k) => pip(k, STATE_TONE[k], `${DOC_STATES[k].label} — ${counts[k]} de ${total}`, counts[k]))}
    </button>
  );
}

/** Completude: o percentual e a barra (verde completa, azul acima de 70%, vermelha abaixo). */
export function Completeness({ pct }: { pct: number }) {
  return (
    <div className="flex flex-col items-start gap-1">
      <b className="text-xs font-extrabold text-brand-purple-dark">{pct}%</b>
      <div className="h-[7px] w-full min-w-[60px] overflow-hidden rounded-full bg-brand-purple-dark/8">
        <span
          className={cx("block h-full rounded-full", pct === 100 ? "bg-brand-green" : pct >= 70 ? "bg-brand-blue" : "bg-brand-red")}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

/* ---------- drawers ---------- */

/** O título do drawer: o profissional em cima, o assunto embaixo. */
export function DrawerTitle({ crumb, title }: { crumb: string; title: string }) {
  return (
    <div>
      <p className="text-xs font-bold text-brand-purple-dark/50">{crumb}</p>
      <h3 className="mt-[3px] text-[19px] font-extrabold text-pretty text-brand-purple-dark">{title}</h3>
    </div>
  );
}

const BANNER_TONE: Record<DocState, [string, string]> = {
  ok: ["bg-brand-green/12", "text-brand-green-dark"],
  expiring: ["bg-brand-orange/16", "text-orange-dark"],
  expired: ["bg-brand-red/10", "text-brand-red-dark"],
  missing: ["bg-brand-purple-dark/5", "text-brand-purple-dark/45"],
  waived: ["bg-neutral-600/10", "text-neutral-600"],
};

/** A faixa do estado no topo do drawer. */
export function StateBanner({ state, icon, title, children }: { state: DocState; icon: string; title: string; children: ReactNode }) {
  const [bg, fg] = BANNER_TONE[state];
  return (
    <div className={cx("grid grid-cols-[auto_1fr] items-start gap-3 rounded-xl px-4 py-3.5", bg)}>
      <Icon name={icon} type="solid" className={cx("mt-0.5 text-[15px]", fg)} />
      <div>
        <b className="text-sm font-extrabold text-brand-purple-dark">{title}</b>
        <p className="mt-0.5 text-[13px] text-pretty text-brand-purple-dark/65">{children}</p>
      </div>
    </div>
  );
}

/** Um bloco de destaque com ícone (carga horária, formações). */
export function Highlight({ icon, title, children }: { icon: string; title: string; children: ReactNode }) {
  return (
    <div className="flex items-start gap-[11px] rounded-[10px] bg-brand-blue/9 px-[15px] py-[13px]">
      <Icon name={icon} type="solid" className="mt-0.5 text-[15px] text-brand-blue" />
      <div>
        <b className="text-[15px] font-extrabold text-brand-purple-dark">{title}</b>
        <p className="mt-0.5 text-[12.5px] text-brand-purple-dark/60">{children}</p>
      </div>
    </div>
  );
}

/** Nota informativa. */
export function Note({ children }: { children: ReactNode }) {
  return (
    <div className="flex items-start gap-[9px] rounded-[10px] bg-brand-blue/8 px-[13px] py-[11px] text-xs text-pretty text-brand-purple-dark/60">
      <Icon name="fa-circle-info" type="solid" className="mt-0.5 text-brand-blue" />
      {children}
    </div>
  );
}

/** Rótulo e valor do drawer de documento. */
export function Meta({ items }: { items: [string, string][] }) {
  return (
    <dl className="grid grid-cols-2 gap-3.5">
      {items.map(([dt, dd]) => (
        <div key={dt}>
          <dt className="text-[11px] font-extrabold tracking-[.02em] text-brand-purple-dark/45 uppercase">{dt}</dt>
          <dd className="mt-[3px] text-sm font-bold text-brand-purple-dark">{dd}</dd>
        </div>
      ))}
    </dl>
  );
}
