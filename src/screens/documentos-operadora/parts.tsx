/**
 * Documentos da Operadora — peças locais da feature.
 * Novo — não existe no Phoenix: cada peça abaixo é da tela, montada sobre
 * componentes do catálogo e com tokens do monólito.
 */
import type { ReactNode } from "react";
import { Button } from "../../components/Button.js";
import { Icon } from "../../components/Icon.js";
import { Input } from "../../components/Input.js";
import { Avatar } from "../../components/Layout.js";
import { Dropdown } from "../../components/Overlay.js";
import { Tag, type TagVariant } from "../../components/Tag.js";

/** Os totais por status acima dos filtros: `tag`s. */
export function SummaryTags({ items }: { items: [string, TagVariant][] }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {items.map(([label, variant]) => (
        <Tag key={label} item={label} variant={variant} className="font-extrabold" />
      ))}
    </div>
  );
}

/** A linha de filtros: os campos lado a lado e, com filtro ativo, Limpar. */
export function FilterBar({ active, onClear, children }: { active: boolean; onClear: () => void; children: ReactNode }) {
  return (
    <div className="flex flex-wrap items-end gap-3">
      {children}
      {active && (
        <Button type="button" variant="ghost" onClick={onClear} className="text-brand-blue">
          Limpar
        </Button>
      )}
    </div>
  );
}

/** Busca por texto: `input` com a lupa. */
export function SearchFilter({ id, label, placeholder, value, onChange }: { id: string; label: string; placeholder: string; value: string; onChange: (v: string) => void }) {
  return (
    <Input
      id={id}
      name={id}
      label={label}
      leftIcon="fa-magnifying-glass"
      placeholder={placeholder}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="min-w-[220px] flex-1"
    />
  );
}

/** Um filtro de lista: `input type="select"`, vazio é "Todas"/"Todos". */
export function SelectFilter({ id, label, prompt, options, value, onChange }: { id: string; label: string; prompt: string; options: string[]; value: string; onChange: (v: string) => void }) {
  return (
    <Input
      type="select"
      id={id}
      name={id}
      label={label}
      prompt={prompt}
      options={options.map((o) => [o, o] as const)}
      value={value}
      onChange={(v) => onChange(v ?? "")}
      className="min-w-[180px]"
    />
  );
}

/** "3 de 10 profissionais" com filtro ativo. */
export function FilterCount({ shown, total, noun }: { shown: number; total: number; noun: string }) {
  return (
    <p className="text-sm text-brand-purple-dark/60">
      <b className="font-extrabold text-brand-purple-dark">{shown}</b> de {total} {noun}
    </p>
  );
}

/** Nome em destaque com uma linha de apoio. */
export function Who({ name, detail }: { name: string; detail?: string }) {
  return (
    <div>
      <p className="whitespace-nowrap font-bold text-brand-purple-dark">{name}</p>
      {detail && <p className="text-xs text-brand-purple-dark/60">{detail}</p>}
    </div>
  );
}

/** Um valor com a linha de apoio embaixo (tempo de formado, carga ABA). */
export function Value({ value, detail }: { value: string; detail?: string | null }) {
  return (
    <div className="whitespace-nowrap">
      <p className="font-bold tabular-nums text-brand-purple-dark">{value}</p>
      {detail && <p className="text-xs text-brand-purple-dark/60">{detail}</p>}
    </div>
  );
}

/** Célula sem valor. */
export function None({ children = "—" }: { children?: string }) {
  return <span className="text-sm text-brand-purple-dark/45">{children}</span>;
}

/** Quantos documentos foram compartilhados e quantos exigidos faltam. */
export function DocCount({ shared, missing }: { shared: number; missing: number }) {
  return (
    <span className="whitespace-nowrap">
      <b className="font-bold text-brand-purple-dark">{shared}</b>
      {missing > 0 && <Missing count={missing} className="ml-2" />}
    </span>
  );
}

export function Missing({ count, className }: { count: number; className?: string }) {
  return (
    <span className={["inline-flex items-center gap-1 text-xs font-bold text-orange-dark", className].filter(Boolean).join(" ")}>
      <Icon name="fa-triangle-exclamation" type="solid" /> falta {count}
    </span>
  );
}

export type MenuAction = { label: string; icon: string; onClick: () => void; disabled?: boolean; separated?: boolean };

/** O menu Ações da linha: `dropdown` com um `button` ghost por ação. */
export function RowActions({ id, actions }: { id: string; actions: MenuAction[] }) {
  return (
    <Dropdown
      id={id}
      className="inline-block"
      items={
        <div className="flex flex-col gap-0.5 p-1">
          {actions.map((a) => (
            <div key={a.label} className={a.separated ? "mt-1 border-t border-brand-purple-dark/10 pt-1" : undefined}>
              <Button
                type="button"
                variant="ghost"
                size="medium"
                leftIcon={a.icon}
                disabled={a.disabled}
                onClick={a.onClick}
                className="w-full justify-start! text-brand-purple-dark disabled:opacity-40"
              >
                {a.label}
              </Button>
            </div>
          ))}
        </div>
      }
    >
      <Button type="button" variant="tint" size="small" leftIcon="fa-ellipsis-vertical" iconType="solid" className="px-3">
        Ações
      </Button>
    </Dropdown>
  );
}

/** O topo do drawer: de quem são os documentos. */
export function Subject({ name, meta, icon }: { name: string; meta: string; icon?: string }) {
  return (
    <div className="flex items-center gap-3 rounded-xl bg-brand-purple-dark/5 px-4 py-3">
      {icon ? (
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brand-blue/16 text-brand-purple-dark">
          <Icon name={icon} type="solid" />
        </div>
      ) : (
        <Avatar size="medium" />
      )}
      <div>
        <p className="font-extrabold text-brand-purple-dark">{name}</p>
        <p className="text-sm text-brand-purple-dark/60">{meta}</p>
      </div>
    </div>
  );
}

/** Rótulo de uma seção do drawer. */
export function SectionLabel({ children }: { children: string }) {
  return <p className="mt-6 mb-2 text-xs font-black uppercase tracking-wide text-brand-purple-dark/45">{children}</p>;
}

/** Um documento no drawer: compartilhar ou não com a operadora (`input type="checkbox"`), e a validade. */
export function DocCheck({
  id,
  name,
  detail,
  badge,
  checked,
  disabled,
  state,
  onChange,
}: {
  id: string;
  name: string;
  detail: string;
  badge?: ReactNode;
  checked: boolean;
  disabled?: boolean;
  state: { label: string; variant: TagVariant };
  onChange: (on: boolean) => void;
}) {
  return (
    <div
      className={[
        "flex items-center gap-3 rounded-xl border pr-4 transition-colors",
        checked ? "border-brand-blue bg-brand-blue/10" : "border-brand-purple-dark/10",
      ].join(" ")}
    >
      <div className="min-w-0 flex-1">
        <Input
          type="checkbox"
          id={id}
          name={id}
          label={name}
          checked={checked}
          disabled={disabled}
          onChange={(e) => onChange(e.target.checked)}
          className="[&_label]:w-full [&_label]:cursor-pointer [&_label]:bg-transparent! [&_label]:pb-1 [&_label]:font-bold"
        />
        <p className="-mt-0.5 flex flex-wrap items-center gap-2 pb-3 pl-[46px] text-xs text-brand-purple-dark/60">
          {detail}
          {badge}
        </p>
      </div>
      <Tag item={state.label} variant={state.variant} className="shrink-0 whitespace-nowrap" />
    </div>
  );
}

/** O rodapé do drawer. */
export function DrawerFooter({ onDone }: { onDone: () => void }) {
  return (
    <div className="mt-6 flex justify-end">
      <Button type="button" rightIcon="fa-check" onClick={onDone}>
        Concluir
      </Button>
    </div>
  );
}
