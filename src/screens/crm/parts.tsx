/**
 * CRM de Leads — peças locais da feature.
 * Novo — não existe no Phoenix: cada peça abaixo é da tela, montada sobre
 * componentes do catálogo e com tokens do monólito.
 */
import type { ReactNode } from "react";
import { Button } from "../../components/Button.js";
import { Card } from "../../components/Card.js";
import { Icon } from "../../components/Icon.js";
import { Input, type FormField } from "../../components/Input.js";
import { Progress } from "../../components/Layout.js";
import { Dropdown } from "../../components/Overlay.js";
import { Tag } from "../../components/Tag.js";
import {
  ANCHORS, CHANNELS, CHECKLIST, ROLES, STAGES, checkItem, columnOf, pendingOf, stageOf, stageOfItem, statusLabel,
  type ColumnId, type Lead, type RoleId, type StageId, type TabId,
} from "./model.js";

export function cx(...classes: (string | false | null | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}

/** Um `FormField` mínimo para os componentes que pedem `field`. */
export const fld = (id: string, value?: unknown): FormField => ({ id, name: id, value });

/** O estado desabilitado que o Phoenix passa por `class` no `<.button>`. */
export const DISABLED = "disabled:cursor-not-allowed disabled:opacity-40";

export const opts = (list: readonly string[]) => list.map((o) => [o, o] as const);

/* ---------- filtros (como em `profissionais/parts.tsx`) ---------- */

export function SearchFilter({ id, label, placeholder, value, onChange }: { id: string; label: string; placeholder: string; value: string; onChange: (v: string) => void }) {
  return <Input id={id} name={id} label={label} placeholder={placeholder} value={value} rightIcon="fa-search" onChange={(e) => onChange(e.target.value)} />;
}

export function SelectFilter({
  id, label, prompt, options, value, onChange,
}: {
  id: string;
  label: string;
  prompt?: string;
  options: readonly (readonly [string, string])[];
  value: string;
  onChange: (v: string) => void;
}) {
  return <Input type="select" id={id} name={id} label={label} prompt={prompt} clear={prompt != null} options={options} value={value} onChange={(v) => onChange(v ?? "")} />;
}

/* ---------- alternância funil / tabela ---------- */

export type ViewOption<V extends string> = { id: V; title: string; icon: string };

/** O desenho do `button_tabs`, só com ícone. */
export function ViewToggle<V extends string>({ options, value, onChange }: { options: ViewOption<V>[]; value: V; onChange: (v: V) => void }) {
  return (
    <div role="group" aria-label="Visualização" className="inline-flex gap-0.5 rounded-[10px] bg-brand-purple-dark/6 p-[3px]">
      {options.map((o) => {
        const on = o.id === value;
        return (
          <button
            key={o.id}
            type="button"
            title={o.title}
            aria-pressed={on}
            onClick={() => onChange(o.id)}
            className={cx(
              "inline-flex h-10 w-10 cursor-pointer items-center justify-center rounded-lg transition-all duration-200 ease-in-out",
              on ? "bg-white text-brand-blue-dark shadow-main" : "text-brand-purple-dark/50 hover:text-brand-purple-dark",
            )}
          >
            <Icon name={o.icon} type="solid" />
          </button>
        );
      })}
    </div>
  );
}

/* ---------- etapa ---------- */

/** A etapa como `<.tag>`, na cor do `prospect_step_tag`. */
export function StageTag({ id, compact = false }: { id: ColumnId; compact?: boolean }) {
  const c = columnOf(id);
  return <Tag item={id === "desqualificado" ? "Desqualificado" : c.label} variant={c.color} className={compact ? "rounded px-2 py-0.5 text-xs !font-bold" : "rounded-full px-3 py-1"} />;
}

/** O ponto colorido do cabeçalho da coluna e o fundo da coluna, por etapa. */
export const STAGE_DOT: Record<ColumnId, string> = {
  novo: "bg-blue", contato: "bg-brand-purple-dark/40", avaliacao: "bg-purple", agendada: "bg-cyan", proposta: "bg-brand-orange",
  aguardando: "bg-yellow", efetivado: "bg-green", desqualificado: "bg-brand-purple-dark/60", perdido: "bg-red",
};
export const STAGE_BG: Record<ColumnId, string> = {
  novo: "bg-blue/10", contato: "bg-brand-purple-dark/5", avaliacao: "bg-purple/10", agendada: "bg-cyan/10", proposta: "bg-brand-orange/10",
  aguardando: "bg-yellow/10", efetivado: "bg-green/10", desqualificado: "bg-brand-purple-dark/5", perdido: "bg-red/10",
};

/** O seletor de etapa do cabeçalho do negócio: ajuste manual, com o checklist de cada uma. */
export function StageMenu({ lead, onMove }: { lead: Lead; onMove: (to: StageId) => void }) {
  const cur = STAGES.findIndex((s) => s.id === lead.status);
  const items = (
    <div className="w-72 py-1">
      <p className="px-2 pb-1 pt-1 text-xs font-bold uppercase tracking-widest text-brand-purple-dark/60">Mover para etapa</p>
      {STAGES.map((s, i) => {
        const isCur = s.id === lead.status;
        const pend = s.needs.filter((id) => !checkItem(id).test(lead)).length;
        const first = i === 0 || STAGES[i - 1]!.role !== s.role;
        return (
          <div key={s.id}>
            {first && <p className="px-2 pt-2 text-xs font-bold uppercase tracking-widest text-brand-blue-dark">{ROLES[s.role].label}</p>}
            <button
              type="button"
              disabled={isCur}
              onClick={() => onMove(s.id)}
              className={cx(
                "flex w-full items-center gap-3 rounded-sm p-2 text-left font-semibold transition-colors",
                isCur ? "cursor-default bg-brand-blue/10 text-brand-blue-dark" : "text-brand-purple-dark/70 hover:bg-brand-purple-dark/10 hover:text-brand-purple-dark",
              )}
            >
              <Icon name={isCur ? "fa-circle-dot" : cur >= 0 && i < cur ? "fa-circle-check" : "fa-circle"} type="solid" className={cx("text-sm", !isCur && cur >= 0 && i < cur && "text-green")} />
              <span className="flex-1">{s.label}</span>
              <small className="text-xs text-brand-purple-dark/50">{isCur ? "Atual" : s.needs.length === 0 ? "" : pend === 0 ? "Checklist ok" : `${pend} pendente${pend > 1 ? "s" : ""}`}</small>
            </button>
          </div>
        );
      })}
      <p className="mt-1 border-t border-neutral-100 px-2 pt-2 text-xs text-brand-purple-dark/60">O ajuste manual fica registrado no histórico.</p>
    </div>
  );
  return (
    <Dropdown id="deal-stage-menu" placement="bottom-start" items={items}>
      <div
        title="Mover etapa manualmente"
        className="flex h-12 min-w-56 items-center justify-between gap-4 rounded-lg border border-brand-purple-dark/10 bg-brand-purple-dark/10 px-4 text-brand-purple-dark/80"
      >
        {statusLabel(lead.status)}
        <Icon name="fa-chevron-down" className="text-sm text-brand-purple-dark/60" />
      </div>
    </Dropdown>
  );
}

/* ---------- abas do negócio ---------- */

export type DealTab = { id: TabId; label: string; role?: RoleId };

export const DEAL_TABS: DealTab[] = [
  { id: "negocio", label: "Negócio", role: "comercial" },
  { id: "visita", label: "Visita", role: "coordenacao" },
  { id: "autorizacao", label: "Autorização", role: "orcamento" },
  { id: "historico", label: "Histórico" },
];

/**
 * O desenho das abas do card de paciente e profissional (`lazy_tabs/1`: borda
 * em cima, botão e marcador), com o papel e
 * o contador de pendências de cada uma. As `Tabs` do catálogo não aceitam
 * conteúdo extra no título nem troca de aba de fora: por isso é da tela.
 */
export function DealTabs({ lead, value, onChange }: { lead: Lead; value: TabId; onChange: (t: TabId) => void }) {
  const role = stageOf(lead.status)?.role;
  return (
    <div className="relative flex w-full select-none gap-4 overflow-x-auto overflow-y-hidden border-t border-brand-purple-dark/10 px-6 pb-1 thin-scrollbar">
      {DEAL_TABS.map((t) => {
        const active = t.id === value;
        const items = t.role ? CHECKLIST.filter((i) => i.role === t.role) : [];
        const pend = items.filter((i) => !i.test(lead)).length;
        return (
          <button
            key={t.id}
            type="button"
            onClick={() => onChange(t.id)}
            className={cx(
              "relative flex cursor-pointer items-center gap-2 whitespace-nowrap rounded-md py-4 font-bold transition-all",
              active ? "text-blue-dark" : "text-neutral-400",
            )}
          >
            {role && t.role === role && <span className="h-2 w-2 rounded-full bg-brand-blue" title="Etapa atual" />}
            {t.label}
            {t.role && <span className="text-xs font-semibold text-brand-purple-dark/50">{ROLES[t.role].label}</span>}
            {t.role && (pend > 0
              ? <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-brand-orange/20 px-1.5 text-xs font-extrabold text-orange-dark">{pend}</span>
              : <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-brand-green/20 text-[10px] text-brand-green-dark"><Icon name="fa-check" type="solid" /></span>)}
            {active && <span className="absolute inset-x-0 -bottom-1 h-1 bg-blue" />}
          </button>
        );
      })}
    </div>
  );
}

/* ---------- cartões de seção ---------- */

export function Section({
  title, desc, tag, tagVariant = "dark-purple", anchor, children, className,
}: {
  title?: string;
  desc?: string;
  tag?: string | null;
  tagVariant?: "dark-purple" | "green";
  anchor?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div data-anchor={anchor} className="scroll-mt-24 rounded-2xl transition-shadow duration-300">
      <Card className={cx("space-y-4", className)}>
        {(title || tag) && (
          <header className="flex items-start justify-between gap-3">
            <div>
              {title && <h3 className="text-lg font-bold text-brand-purple-dark">{title}</h3>}
              {desc && <p className="text-sm text-brand-purple-dark/60">{desc}</p>}
            </div>
            {tag && <Tag item={tag} variant={tagVariant} pill />}
          </header>
        )}
        {children}
      </Card>
    </div>
  );
}

/** O título de bloco do modal de Leads (`visits_tab`). */
export function Subhead({ children }: { children: ReactNode }) {
  return <h4 className="pt-2 text-sm font-bold uppercase tracking-widest text-brand-purple-dark/60">{children}</h4>;
}

export function Note({ children }: { children: ReactNode }) {
  return <p className="text-sm text-brand-purple-dark/60">{children}</p>;
}

/** Faixa de aviso, nas cores do `info_card`. */
export function Banner({ tone = "blue", icon, children, action }: { tone?: "blue" | "green" | "orange"; icon?: string; children: ReactNode; action?: ReactNode }) {
  return (
    <div
      className={cx(
        "flex flex-col gap-3 rounded-xl p-4 sm:flex-row sm:items-center sm:justify-between",
        tone === "blue" && "bg-brand-blue/10 text-brand-blue-dark",
        tone === "green" && "bg-brand-green/20 text-brand-green-dark",
        tone === "orange" && "bg-brand-orange/20 text-brand-orange-dark",
      )}
    >
      <p className="text-sm font-semibold">
        {icon && <Icon name={icon} type="solid" className="mr-2" />}
        {children}
      </p>
      {action}
    </div>
  );
}

/** Lista de leitura: rótulo e valor. */
export function Facts({ items }: { items: [string, ReactNode][] }) {
  return (
    <dl className="divide-y divide-brand-purple-dark/10">
      {items.map(([k, v]) => (
        <div key={k} className="grid grid-cols-[110px_minmax(0,1fr)] gap-3 py-2 text-sm">
          <dt className="text-brand-purple-dark/60">{k}</dt>
          <dd className="font-semibold text-brand-purple-dark">{v}</dd>
        </div>
      ))}
    </dl>
  );
}

/** As iniciais no lugar da foto: o lead ainda não tem `avatar_url`. */
export function Initials({ name, size = "large", title }: { name: string; size?: "medium" | "large"; title?: string }) {
  const initials = (name.trim() || "?").split(/\s+/).slice(0, 2).map((w) => w[0]).join("").toUpperCase();
  return (
    <span
      title={title}
      className={cx(
        "flex flex-none items-center justify-center rounded-full bg-brand-blue/20 font-extrabold text-brand-blue-dark",
        size === "large" && "h-20 w-20 text-2xl",
        size === "medium" && "h-8 w-8 text-xs",
      )}
    >
      {initials}
    </span>
  );
}

/** Remover uma linha (como o `fa-trash` do `item/1`). */
export function RemoveButton({ title, onClick }: { title: string; onClick: () => void }) {
  return (
    <Button type="button" variant="tint" color="red" title={title} aria-label={title} onClick={onClick} className="flex-none">
      <Icon name="fa-trash" className="block h-4 w-4 self-center" />
    </Button>
  );
}

/* ---------- canal de contato ---------- */

export function ChannelPicker({ value, onChange }: { value: string; onChange: (id: string) => void }) {
  return (
    <div className="flex flex-wrap gap-2">
      {CHANNELS.map((c) => (
        <Button key={c.id} type="button" size="small" variant={value === c.id ? "tint" : "ghost"} leftIcon={c.icon} aria-pressed={value === c.id} onClick={() => onChange(c.id)}>
          {c.label}
        </Button>
      ))}
    </div>
  );
}

/* ---------- checklist ---------- */

/**
 * Rola até o campo do item, destaca o cartão e foca o primeiro campo vazio.
 */
export function goToItem(itemId: string) {
  const el = document.querySelector<HTMLElement>(`[data-anchor="${ANCHORS[itemId]}"]`);
  if (!el) return;
  el.scrollIntoView({ behavior: "smooth", block: "start" });
  el.classList.add("ring-2", "ring-brand-blue", "ring-offset-2");
  setTimeout(() => el.classList.remove("ring-2", "ring-brand-blue", "ring-offset-2"), 1600);
  const fields = [...el.querySelectorAll<HTMLInputElement>("input:not([type=hidden]):not([type=checkbox]):not([type=radio]):not([type=file]), textarea")].filter((x) => !x.disabled);
  const target = fields.find((x) => !String(x.value || "").trim()) ?? el.querySelector<HTMLElement>("button");
  if (target) setTimeout(() => target.focus({ preventScroll: true }), 350);
}

export function Checklist({ roleId, lead }: { roleId: RoleId; lead: Lead }) {
  const items = CHECKLIST.filter((i) => i.role === roleId);
  const done = items.filter((i) => i.test(lead)).length;
  const stage = stageOf(lead.status);
  const isTurn = stage?.role === roleId;
  const pending = isTurn ? pendingOf(lead) : [];
  const pct = Math.round((done / items.length) * 100);
  const sorted = [...items].sort((a, b) => Number(a.test(lead)) - Number(b.test(lead)));
  return (
    <Card className="space-y-4">
      <header className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-bold text-brand-purple-dark">Checklist · {ROLES[roleId].label}</h3>
          <p className="text-sm text-brand-purple-dark/60">{done} de {items.length} concluídos</p>
        </div>
        <Tag item={`${pct}%`} variant={done === items.length ? "green" : "dark-purple"} pill />
      </header>
      <Progress value={pct} showPercentage={false} />
      {isTurn && stage && (
        <Banner>
          {pending.length === 0
            ? "Etapa completa. Use “Avançar” no rodapé."
            : `Sua vez: ${pending.length === 1 ? "falta 1 item" : `faltam ${pending.length} itens`} para sair de ${stage.label}.`}
        </Banner>
      )}
      <ul className="space-y-1">
        {sorted.map((i) => {
          const ok = i.test(lead);
          const now = !ok && stage && stageOfItem(i.id)?.id === stage.id;
          return (
            <li key={i.id}>
              <button
                type="button"
                title="Ir para o campo"
                onClick={() => goToItem(i.id)}
                className={cx(
                  "flex w-full items-center gap-3 rounded-lg px-2 py-1.5 text-left text-sm font-semibold transition-colors hover:bg-brand-purple-dark/5",
                  ok && "text-brand-purple-dark/40 line-through",
                  !ok && "text-brand-purple-dark",
                  now && "bg-brand-orange/20 hover:bg-brand-orange/30",
                )}
              >
                <Icon name={ok ? "fa-circle-check" : "fa-circle"} type="solid" className={ok ? "text-green" : "text-brand-purple-dark/30"} />
                {i.label}
              </button>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}
