/**
 * Central de Transferências — peças locais da feature.
 * Novo — não existe no Phoenix: cada peça abaixo é da tela, montada sobre
 * componentes do catálogo e com tokens do monólito.
 */
import type { ReactNode } from "react";
import { Button } from "../../components/Button.js";
import { Card } from "../../components/Card.js";
import { Icon } from "../../components/Icon.js";
import { Input } from "../../components/Input.js";
import { Tag, type TagVariant } from "../../components/Tag.js";

/** Um horário ou uma hora (`Seg 08:00–09:00`): `tag` neutra. */
export function SlotTag({ children, className }: { children: string; className?: string }) {
  return <Tag item={children} variant="dark-purple" className={["whitespace-nowrap", className].filter(Boolean).join(" ")} />;
}

/**
 * A largura do seletor de destino e do que fica no lugar dele: cabe
 * "Carolina Mattos · Sala 15" e "Personalizado por horário" sem cortar.
 */
export const DEST_WIDTH = "w-[340px] max-w-full shrink-0";

const STATUS_VARIANT = { ok: "green", bad: "red", soft: "dark-purple", prog: "light-purple" } as const satisfies Record<string, TagVariant>;

/**
 * O lugar do seletor quando não há o que escolher, ou o resultado: `tag` pill
 * com `left_icon` (o `icon` do sistema, no estilo regular).
 */
export function StatusTag({ status, icon, children }: { status: keyof typeof STATUS_VARIANT; icon: string; children: string }) {
  return <Tag pill item={children} variant={STATUS_VARIANT[status]} leftIcon={icon} className={`ml-auto ${DEST_WIDTH} whitespace-nowrap py-1.5`} />;
}

/** Nome em destaque com uma linha de apoio (paciente, profissional). */
export function Who({ name, detail }: { name: string; detail: string }) {
  return (
    <div className="min-w-40 flex-1">
      <p className="truncate text-sm font-extrabold text-brand-purple-dark">{name}</p>
      <p className="truncate text-xs text-brand-purple-dark/60">{detail}</p>
    </div>
  );
}

/** Cartão de um mapa ou de um titular na lista. */
export function ItemCard({ children }: { children: ReactNode }) {
  return <div className="flex flex-col gap-3 rounded-xl border border-brand-purple-dark/10 bg-white px-4 py-3">{children}</div>;
}

/** O cabeçalho do card da lista: título à esquerda, as sub-abas à direita (no `actions` do `button_tabs`). */
export function ListTitle({ children }: { children: string }) {
  return <h2 className="text-lg font-extrabold text-brand-purple-dark">{children}</h2>;
}

/** "Permitir outra especialidade" + "Distribuir", à direita dos filtros. */
export function ListActions({ id, cross, onCross, disabled, onDistribute }: { id: string; cross: boolean; onCross: (on: boolean) => void; disabled: boolean; onDistribute: () => void }) {
  return (
    <div className="ml-auto flex flex-wrap items-center gap-2">
      <Input type="checkbox" id={id} name={id} label="Permitir outra especialidade" checked={cross} onChange={(e) => onCross(e.target.checked)} className="text-sm" />
      <Button type="button" variant="tint" leftIcon="fa-wand-magic-sparkles" iconType="solid" disabled={disabled} onClick={onDistribute} className="gap-2">
        Distribuir
      </Button>
    </div>
  );
}

/** Aviso de exceção de especialidade, com o motivo. */
export function CrossException({ id, why, onWhy, record = "do mapa" }: { id: string; why: string; onWhy: (v: string) => void; record?: string }) {
  return (
    <div className="flex gap-3 rounded-xl border border-brand-orange/50 bg-brand-orange/10 p-4">
      <Icon name="fa-triangle-exclamation" type="solid" className="mt-0.5 text-orange-dark" />
      <div className="flex-1">
        <p className="text-sm font-extrabold text-brand-purple-dark">Transferência fora da especialidade</p>
        <p className="text-sm text-brand-purple-dark/70">Fora do padrão da clínica. Registre o motivo — fica no histórico {record}.</p>
        <Input id={id} name={id} placeholder="Motivo da exceção" value={why} onChange={(e) => onWhy(e.target.value)} className="mt-3" />
      </div>
    </div>
  );
}

/** Texto de apoio abaixo de um campo. */
export function Hint({ children, warn = false, icon }: { children: ReactNode; warn?: boolean; icon?: string }) {
  return (
    <p className={["text-sm text-pretty", warn ? "font-semibold text-orange-dark" : "text-brand-purple-dark/60"].join(" ")}>
      {icon && <Icon name={icon} type="solid" className="mr-1.5" />}
      {children}
    </p>
  );
}

/** O painel lateral: `card` com título, corpo e rodapé de ações. */
export function SidePanel({ title, subtitle, children, footer }: { title: string; subtitle: string; children?: ReactNode; footer?: ReactNode }) {
  return (
    <Card>
      <div className="flex flex-col gap-5">
        <div>
          <h3 className="text-lg font-extrabold text-brand-purple-dark">{title}</h3>
          <p className="text-sm text-brand-purple-dark/60">{subtitle}</p>
        </div>
        {children}
        {footer && <div className="flex justify-end gap-2">{footer}</div>}
      </div>
    </Card>
  );
}

/** Um bloco de números: título e linhas rótulo · valor. */
export function Summary({ title, lines }: { title?: string; lines: [string, ReactNode][] }) {
  return (
    <div className="flex flex-col gap-2">
      {title && <p className="text-sm font-extrabold text-brand-purple-dark">{title}</p>}
      {lines.map(([label, value]) => (
        <div key={label} className="flex justify-between gap-3 text-sm text-brand-purple-dark/70">
          <span>{label}</span>
          <b className="font-extrabold text-brand-purple-dark">{value}</b>
        </div>
      ))}
    </div>
  );
}
