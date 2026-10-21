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

/** O profissional: nome, a situação no Bloomy com o ponto colorido e as unidades. */
export function BloomyWho({ name, status, detail }: { name: string; status: { label: string; dot: string; text: string }; detail: string }) {
  return (
    <div>
      <p className="whitespace-nowrap font-bold text-brand-purple-dark">{name}</p>
      <p className="flex flex-wrap items-center gap-x-1.5 text-xs text-brand-purple-dark/60">
        <span className={["inline-flex items-center gap-1.5 font-bold", status.text].join(" ")}>
          <span className={["h-1.5 w-1.5 rounded-full", status.dot].join(" ")} />
          {status.label}
        </span>
        {detail}
      </p>
    </div>
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

/** Quantos documentos foram compartilhados e quantos deles venceram. */
export function DocCount({ shared, expired }: { shared: number; expired: number }) {
  return (
    <span className="whitespace-nowrap">
      <b className="font-bold text-brand-purple-dark">{shared}</b>
      {expired > 0 && (
        <span className="ml-2 inline-flex items-center gap-1 text-xs font-bold text-red">
          <Icon name="fa-triangle-exclamation" type="solid" /> {expired} {expired === 1 ? "vencido" : "vencidos"}
        </span>
      )}
    </span>
  );
}

/** "revisar": credenciado na operadora, mas inativo ou em desligamento no Bloomy. */
export function ReviewFlag() {
  return (
    <span className="inline-flex items-center gap-1 text-xs font-bold text-orange-dark">
      <Icon name="fa-triangle-exclamation" type="solid" /> revisar
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

export type MenuAction = { label: string; icon: string; onClick: () => void; disabled?: boolean; separated?: boolean; danger?: boolean };

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
                className={["w-full justify-start! disabled:opacity-40", a.danger ? "text-red" : "text-brand-purple-dark"].join(" ")}
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

/** Um documento no drawer: compartilhar ou não com a operadora (`input type="switch"`), e a validade. */
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
  state?: { label: string; variant: TagVariant };
  onChange: (on: boolean) => void;
}) {
  // O cartão do `switch_card` (o cartão inteiro liga a chave), com a validade e o selo ao lado do nome.
  return (
    <label htmlFor={id} className={["inline-block w-full", disabled ? "cursor-default" : "cursor-pointer"].join(" ")}>
      <div
        className={[
          "flex items-center gap-3 rounded-xl border py-1 pl-4 pr-3 transition-colors delay-100",
          checked ? "bg-brand-blue/10 border-brand-blue/40" : "bg-brand-purple-dark/5 border-transparent",
        ].join(" ")}
      >
        <div className="min-w-0 flex-1">
          <p className="font-extrabold text-brand-purple-dark">{name}</p>
          <p className="flex flex-wrap items-center gap-2 text-xs text-brand-purple-dark/60">
            {detail}
            {badge}
          </p>
        </div>
        {state && <Tag item={state.label} variant={state.variant} className="shrink-0 whitespace-nowrap" />}
        <Input type="switch" id={id} name={id} value={checked} disabled={disabled} onChange={(e) => onChange(e.target.checked)} />
      </div>
    </label>
  );
}

/** Aviso acima dos filtros: quem precisa de revisão, com o atalho para filtrar só esses. */
export function ReviewNotice({ title, detail, action, onAction }: { title: string; detail: string; action: string; onAction: () => void }) {
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-xl border border-brand-orange bg-brand-orange/20 px-4 py-3">
      <Icon name="fa-triangle-exclamation" type="solid" className="text-orange-dark" />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-bold text-brand-purple-dark">{title}</p>
        <p className="text-xs text-brand-purple-dark/60">{detail}</p>
      </div>
      <Button type="button" variant="tint" size="small" onClick={onAction}>
        {action}
      </Button>
    </div>
  );
}

/**
 * O conteúdo do drawer em coluna, para o rodapé encostar embaixo mesmo com
 * pouco conteúdo, e sem o padding de baixo, que o `sticky` do rodapé não
 * atravessa. Vai no `contentClass` (`content_class` do `drawer_modal`).
 */
export const DRAWER_CONTENT = "flex flex-col pb-0!";

/**
 * O rodapé do drawer, sempre fixo embaixo: o `drawer_modal` não tem slot de
 * rodapé, então ele fica no fim do conteúdo, preso com `sticky` e sangrando o
 * padding lateral. O espaçador antes dele empurra para baixo e garante 24px
 * depois do último item. Sem `children`, mostra Concluir.
 */
export function DrawerFooter({ onDone, children }: { onDone?: () => void; children?: ReactNode }) {
  return (
    <>
      <div className="min-h-6 flex-1" />
      <div className="sticky bottom-0 -mx-6 flex justify-end gap-3 border-t border-neutral-100 bg-white px-6 py-4">
        {children ?? (
          <Button type="button" rightIcon="fa-check" onClick={onDone}>
            Concluir
          </Button>
        )}
      </div>
    </>
  );
}
