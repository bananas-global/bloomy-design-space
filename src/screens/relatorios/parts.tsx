/**
 * Relatórios do paciente — peças locais da feature.
 * Novo — não existe no Phoenix: cada componente abaixo é da tela, montado sobre
 * `Tag`, `Avatar` e `Icon` do catálogo e com tokens do monólito.
 */
import type { ReactNode } from "react";
import { Avatar } from "../../components/Layout.js";
import { Icon } from "../../components/Icon.js";
import { Tag, type TagVariant } from "../../components/Tag.js";
import { LIST_STATUS, SHARE_META, shareState, shortDate, daysLate, dueText, type ListRow, type ListStatus } from "./model.js";

const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(" ");

const STATUS_VARIANT: Record<ListStatus, TagVariant> = {
  previsto: "dark-purple",
  solicitado: "dark-purple",
  em_andamento: "light-blue",
  assinaturas: "orange",
  finalizado: "green",
  cancelado: "red",
};

/**
 * Selo de status da lista (`Rp2StatusBadge`). Novo — não existe no Phoenix.
 * É um `Tag` pill; "Previsto pela rotina" ganha contorno para não parecer registro.
 */
export function ReportStatusBadge({ status }: { status: ListStatus }) {
  const s = LIST_STATUS[status];
  return (
    <Tag
      pill
      item={s.label}
      leftIcon={s.icon}
      variant={STATUS_VARIANT[status]}
      className={cx("whitespace-nowrap", status === "previsto" && "ring-1 ring-inset ring-brand-purple-dark/20")}
    />
  );
}

/** Linha secundária pequena sob um valor da tabela. Novo — não existe no Phoenix. */
export function SubLine({ children, tone = "muted", icon }: { children: ReactNode; tone?: "muted" | "late"; icon?: string }) {
  return (
    <p
      className={cx(
        "mt-1 flex items-center gap-1 text-xs whitespace-nowrap",
        tone === "muted" && "text-brand-purple-dark/55",
        tone === "late" && "font-bold text-red-dark",
      )}
    >
      {icon && <Icon name={icon} className="text-[11px]" />}
      {children}
    </p>
  );
}

/** Traço de célula vazia. Novo — não existe no Phoenix. */
export const Dash = () => <span className="font-bold text-brand-purple-dark/30">—</span>;

/** Pessoa com avatar, nome e especialidade (`RelPerson`). Novo — não existe no Phoenix. */
export function PersonCell({ name, sub }: { name?: string | null; sub?: string | null }) {
  if (!name) {
    return (
      <div className="flex items-center gap-2.5">
        <span className="inline-flex h-8 w-8 flex-none items-center justify-center rounded-full border border-dashed border-brand-purple-dark/25 bg-brand-purple-dark/5 text-[13px] text-brand-purple-dark/40">
          <Icon name="fa-user-plus" type="solid" />
        </span>
        <p className="text-sm font-semibold italic text-brand-purple-dark/50">Sem responsável</p>
      </div>
    );
  }
  return (
    <div className="flex items-center gap-2.5">
      <Avatar size="custom" className="h-8 w-8" title={name} />
      <div>
        <p className="text-sm font-semibold text-brand-purple-dark">{name}</p>
        {sub && <p className="mt-0.5 text-xs text-brand-purple-dark/55">{sub}</p>}
      </div>
    </div>
  );
}

/** Nome do relatório e período · origem. Novo — não existe no Phoenix. */
export function NameCell({ row }: { row: ListRow }) {
  return (
    <>
      {row.late && <span aria-hidden className="absolute inset-y-0 left-0 w-[3px] bg-red" />}
      <p className="text-sm font-bold text-brand-purple-dark">{row.name}</p>
      <p className="mt-0.5 text-xs text-brand-purple-dark/55">{row.meta}</p>
    </>
  );
}

/** Coluna "Prazo / emissão". Novo — não existe no Phoenix. */
export function DueCell({ row }: { row: ListRow }) {
  if (row.status === "finalizado") {
    return (
      <>
        <p className="mb-0.5 text-xs text-brand-purple-dark/55">Emitido em</p>
        <p className="text-sm font-bold whitespace-nowrap text-brand-purple-dark">{shortDate(row.emitAt)}</p>
      </>
    );
  }
  if (row.status === "cancelado") return <Dash />;
  const due = row.fc ? row.fc.due : row.r.due;
  if (!due) return <span className="text-[13px] text-brand-purple-dark/40">Sem prazo</span>;
  const late = (daysLate(due) ?? 0) > 0;
  return (
    <>
      <p className="text-sm font-bold whitespace-nowrap text-brand-purple-dark">{shortDate(due)}</p>
      <SubLine tone={late ? "late" : "muted"}>{dueText(due)}</SubLine>
    </>
  );
}

/** Coluna "Família": compartilhamento e leitura no app. Novo — não existe no Phoenix. */
export function FamilyCell({ row }: { row: ListRow }) {
  if (!row.r || row.status !== "finalizado") return <Dash />;
  const r = row.r;
  const st = shareState(r);
  const s = r.share;
  const badge = (variant: TagVariant, state: keyof typeof SHARE_META, label: string) => (
    <Tag pill item={label} leftIcon={`fa-solid ${SHARE_META[state].icon}`} variant={variant} className="whitespace-nowrap" />
  );
  if (st === "none" || !s) return badge("dark-purple", "none", "Não compartilhado");
  if (st === "revoked") return <>{badge("red", "revoked", "Acesso revogado")}<SubLine>{`em ${s.revokedAt!.split(" ")[0]}`}</SubLine></>;
  if (st === "pending") return <>{badge("light-blue", "pending", "Não lido")}<SubLine>{`Enviado em ${s.sharedAt.split(" ")[0]}`}</SubLine></>;
  const seen = s.recipients.filter((g) => g.viewedAt).length;
  const first = s.recipients.find((g) => g.viewedAt)?.viewedAt ?? "";
  return (
    <>
      {st === "viewed" ? badge("green", "viewed", "Lido") : badge("orange", "partial", "Lido em parte")}
      <SubLine>{`${seen}/${s.recipients.length} · ${first.split(" ")[0]}`}</SubLine>
    </>
  );
}

export type CalloutTone = "info" | "warn" | "danger" | "green";

/** Aviso em bloco colorido dos formulários (`rel-callout`). Novo — não existe no Phoenix. */
export function Callout({ tone, icon, children }: { tone: CalloutTone; icon: string; children: ReactNode }) {
  return (
    <div
      className={cx(
        "flex gap-3 rounded-xl px-4 py-3.5 text-sm leading-normal [&_strong]:font-extrabold",
        tone === "info" && "bg-blue-light text-blue-dark",
        tone === "warn" && "bg-orange-light text-orange-dark",
        tone === "danger" && "bg-red-light text-red-dark",
        tone === "green" && "bg-green-light text-green-dark",
      )}
    >
      <Icon name={icon} type="solid" className="mt-0.5 flex-none text-base" />
      <p>{children}</p>
    </div>
  );
}

/** Rótulo de campo de bloco livre com dica opcional (`rel-field__block`). Novo — não existe no Phoenix. */
export function FieldBlock({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <div>
      <p className="mb-2 text-sm/4 font-bold text-brand-blue">
        {label}
        {hint && <span className="ml-2 text-xs font-medium text-brand-purple-dark/50">{hint}</span>}
      </p>
      {children}
    </div>
  );
}

/** Rodapé fixo das gavetas (botões à direita). Novo — não existe no Phoenix. */
export function DrawerFooter({ children }: { children: ReactNode }) {
  return (
    <div className="sticky -bottom-6 -mx-6 -mb-6 mt-8 flex justify-end gap-3 border-t border-neutral-100 bg-white px-6 py-4">{children}</div>
  );
}

/** Título com subtítulo para `Modal`/`DrawerModal` (slot `custom_title`). Novo — não existe no Phoenix. */
export function TitleWithSub({ title, sub }: { title: string; sub?: string }) {
  return (
    <div className="min-w-0">
      <h1 className="font-bold text-2xl text-blue-dark truncate">{title}</h1>
      {sub && <p className="mt-1 text-sm text-brand-purple-dark/60">{sub}</p>}
    </div>
  );
}
