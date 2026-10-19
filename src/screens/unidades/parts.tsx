/**
 * Unidades — peças locais da feature.
 * Novo — não existe no Phoenix: cada peça abaixo é da tela, montada sobre
 * componentes do catálogo e com tokens do monólito. São as mesmas peças da
 * lista de Profissionais (célula, resumo e completude), para
 * as duas Documentações se comportarem igual.
 */
import type { ReactNode } from "react";
import { Tooltip } from "../../components/Choice.js";
import { Icon } from "../../components/Icon.js";
import { Input } from "../../components/Input.js";
import { StatusTag, Tag, type TagVariant } from "../../components/Tag.js";
import { DOC_STATES, STATE_ORDER, type DocState, type StateCounts, type Unit } from "./model.js";

function cx(...classes: (string | false | null | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}

/* ---------- filtros ---------- */

/** Busca por texto: `input`. */
export function SearchFilter({ id, label, placeholder, value, onChange }: { id: string; label: string; placeholder?: string; value: string; onChange: (v: string) => void }) {
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

/** O ponto de status, o nome e, embaixo, CNES e cidade (ou "Inativa"). */
export function NameCell({ unit }: { unit: Unit }) {
  return (
    <div className="flex items-center gap-2.5 font-semibold text-brand-purple-dark">
      <StatusTag status={unit.active} title={unit.active ? "Ativa" : "Inativa"} className={cx("flex-none", unit.active ? "bg-green" : "bg-red")} />
      <div className="flex min-w-0 flex-col gap-0.5">
        <span className="whitespace-nowrap">{unit.name}</span>
        <span className="text-[11.5px] font-bold whitespace-nowrap text-brand-purple-dark/50">
          {unit.active ? `CNES ${unit.cnes} · ${unit.address.city}` : "Inativa"}
        </span>
      </div>
    </div>
  );
}

/* ---------- matriz de documentação ---------- */

/** Altura fixa das `tag` da matriz: só ícone, ícone e texto ou só texto ficam iguais. */
const TAG_H = "h-6";

/** A variante da `tag` de cada estado. */
export const STATE_TAG: Record<DocState, TagVariant> = {
  ok: "green",
  expiring: "orange",
  expired: "red",
  missing: "dark-purple",
  pending: "dark-blue",
};

/**
 * Uma célula da matriz: a `tag` só com o ícone do estado (o nome fica no
 * `title`) e, às vezes, um rótulo (CLI).
 */
export function CellBox({ state, label, title, onClick }: { state: DocState; label?: string | null; title: string; onClick: () => void }) {
  const st = DOC_STATES[state];
  return (
    <button type="button" title={title} aria-label={title} onClick={onClick} className="cursor-pointer transition-transform duration-150 ease-in-out hover:scale-110">
      <Tag item={label ?? ""} variant={STATE_TAG[state]} leftIcon={`fa-solid ${st.icon}`} className={cx(TAG_H, "min-w-[26px] justify-center whitespace-nowrap")} />
    </button>
  );
}

/** Resumo de um grupo na visão geral: uma `tag` com quantos em cada estado, ou "em dia". */
export function Rollup({ id, counts, total, onClick }: { id: string; counts: StateCounts; total: number; onClick: () => void }) {
  const present = STATE_ORDER.filter((k) => counts[k]);
  const clean = counts.ok === total;
  const breakdown = present.map((k) => `${counts[k]} ${DOC_STATES[k].label.toLowerCase()}`).join(" · ");

  const pip = (key: string, tag: ReactNode, tip: string) => (
    <Tooltip
      key={key}
      id={`${id}-${key}`}
      placement="top"
      tooltipClass="rounded-lg bg-brand-purple-dark px-2.5 py-1.5 text-[11.5px] font-bold whitespace-nowrap text-white shadow-main"
      tooltipTrigger={tag}
      tooltipContent={tip}
    />
  );

  return (
    <button type="button" onClick={onClick} className="flex w-full min-w-[104px] cursor-pointer items-center justify-center gap-[5px] px-0.5 py-1 hover:brightness-95">
      {clean
        ? pip("clean", <Tag item="em dia" variant="green" leftIcon="fa-solid fa-check" className={cx(TAG_H, "whitespace-nowrap")} />, breakdown)
        : present.map((k) =>
            pip(k, <Tag item={String(counts[k])} variant={STATE_TAG[k]} className={cx(TAG_H, "min-w-[26px] justify-center tabular-nums")} />, `${DOC_STATES[k].label} — ${counts[k]} de ${total}`),
          )}
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

/* ---------- drawer ---------- */

/** O título do drawer: a unidade em cima, o documento embaixo. */
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
  pending: ["bg-brand-blue/10", "text-brand-blue-dark"],
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
          <dd className="mt-[3px] text-sm font-bold break-words text-brand-purple-dark">{dd}</dd>
        </div>
      ))}
    </dl>
  );
}
