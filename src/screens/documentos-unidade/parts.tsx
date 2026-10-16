/**
 * Documentos da unidade — peças locais da feature.
 * Novo — não existe no Phoenix: cada componente abaixo é da tela, montado sobre
 * `Tag`, `Button` e `Icon` do catálogo e com tokens do monólito. É o mesmo
 * desenho das peças da aba Documentos do profissional.
 */
import type { ReactNode } from "react";
import { Button } from "../../components/Button.js";
import { Icon } from "../../components/Icon.js";
import { Tag } from "../../components/Tag.js";
import { STATE_VARIANT, docState, opName, rowTitle, type DocRow, type UnitDocument } from "./model.js";

const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(" ");

/** Selo "Padrão" dos documentos que toda ficha deveria ter (`d2-badge`). Novo — não existe no Phoenix. */
export function StandardBadge() {
  return <Tag pill item="Padrão" leftIcon="fa-solid fa-lock" variant="brand" className="whitespace-nowrap" />;
}

/** Status do documento. Novo — não existe no Phoenix. */
export function DocStatusTag({ doc }: { doc: UnitDocument | null }) {
  const st = docState(doc);
  return <Tag pill item={st.label} variant={STATE_VARIANT[st.key]} className="whitespace-nowrap" />;
}

/** Operadoras com acesso ao documento, ou "Não compartilhado". Novo — não existe no Phoenix. */
export function OperatorChips({ doc }: { doc: UnitDocument }) {
  if (doc.sharedWith.length === 0) return <span className="text-sm italic text-brand-purple-dark/50">Não compartilhado</span>;
  return (
    <div className="flex flex-wrap gap-1.5">
      {doc.sharedWith.map((id) => (
        <Tag key={id} pill item={opName(id)} variant="dark-blue" className="whitespace-nowrap" />
      ))}
    </div>
  );
}

/** Ação da linha: Editar quando há documento, Anexar na lacuna padrão. Novo — não existe no Phoenix. */
export function RowAction({ row, canEdit, onAttach, onEdit }: { row: DocRow; canEdit: boolean; onAttach: () => void; onEdit: () => void }) {
  return row.doc ? (
    <Button type="button" size="small" variant="tint" leftIcon="fa-pen" iconType="solid" disabled={!canEdit} className="disabled:opacity-50" onClick={onEdit}>
      Editar
    </Button>
  ) : (
    <Button type="button" size="small" variant="tint" leftIcon="fa-plus" iconType="solid" disabled={!canEdit} className="disabled:opacity-50" onClick={onAttach}>
      Anexar
    </Button>
  );
}

/** Validade e vigência de um documento. */
export function validityText(doc: UnitDocument) {
  if (!doc.validUntil) return "sem validade";
  return doc.validFrom ? `vigência ${doc.validFrom} a ${doc.validUntil}` : `válido até ${doc.validUntil}`;
}

/** O cartão de um documento ou de uma lacuna padrão (`dsa-card`). Novo — não existe no Phoenix. */
export function DocCard({ row, action }: { row: DocRow; action: ReactNode }) {
  const { doc, slot, standard } = row;
  return (
    <div
      className={cx(
        "flex flex-col gap-2 rounded-2xl border p-5",
        doc ? "border-brand-purple-dark/10 bg-white" : "border-brand-purple-dark/20 bg-brand-purple-dark/5",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <span className="flex h-10 w-10 flex-none items-center justify-center rounded-xl bg-brand-blue/16 text-brand-blue-dark">
          <Icon name={slot ? slot.icon : "fa-file-lines"} type="solid" />
        </span>
        <div className="flex flex-wrap items-center justify-end gap-1.5">
          {standard && <StandardBadge />}
          <DocStatusTag doc={doc} />
        </div>
      </div>

      <h4 className="mt-1 font-extrabold text-brand-purple-dark">{rowTitle(row)}</h4>
      {row.extra > 0 && (
        <p className="-mt-1 text-xs font-bold text-brand-blue-dark">
          {`+${row.extra} outro${row.extra > 1 ? "s" : ""} documento${row.extra > 1 ? "s" : ""} deste tipo`}
        </p>
      )}

      {doc ? (
        <p className="text-sm text-brand-purple-dark/60">
          {validityText(doc).replace(/^./, (c) => c.toUpperCase())}
          {slot ? ` · renovação ${slot.renewal}` : ""}
          <br />
          {`atualizado em ${doc.updatedAt} · ${doc.responsible}`}
        </p>
      ) : (
        <p className="text-sm text-brand-purple-dark/60">{`${slot!.hint} · renovação ${slot!.renewal}`}</p>
      )}

      {doc && (
        <div className="mt-auto pt-1">
          <OperatorChips doc={doc} />
        </div>
      )}

      <div className={cx("flex pt-2", !doc && "mt-auto")}>{action}</div>
    </div>
  );
}

/** Rótulo de campo de bloco livre com dica opcional. Novo — não existe no Phoenix. */
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

/**
 * Tamanho das gavetas da aba: o `medium` (`max-w-3xl`) sem os cantos
 * arredondados. No Phoenix: `variant="custom" custom_size="max-w-3xl rounded-none!"`.
 */
export const DRAWER_SIZE = "max-w-3xl rounded-none!";

/**
 * Rodapé fixo das gavetas (botões à direita), sempre no pé da gaveta. Pede
 * `contentClass="flex flex-col"` no `DrawerModal` e o corpo com `flex-1`.
 * Novo — não existe no Phoenix.
 */
export function DrawerFooter({ children }: { children: ReactNode }) {
  return (
    <div className="sticky -bottom-6 z-10 -mx-6 -mb-6 mt-8 flex shrink-0 justify-end gap-3 border-t border-neutral-100 bg-white px-6 py-4">{children}</div>
  );
}
