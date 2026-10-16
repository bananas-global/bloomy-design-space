/**
 * CRM de Leads — a tabela, como em `prospect_live/index.ex`: as mesmas
 * células, o menu ⋮ de ações (`dropdown_button/1`), `meta_info/1` e
 * `pagination/1` com 15 por página (`default_limit` do `Prospect`).
 */
import { useState } from "react";
import { Icon } from "../../components/Icon.js";
import { MetaInfo } from "../../components/Layout.js";
import { Dropdown } from "../../components/Overlay.js";
import { Pagination } from "../../components/Pagination.js";
import { Table } from "../../components/Table.js";
import { Tag } from "../../components/Tag.js";
import { fmtBR, guardianOf, type Lead } from "./model.js";
import { StageTag, cx } from "./parts.js";

const PAGE_SIZE = 15;

export function LeadsTable({ leads, onEdit, onConvert }: { leads: Lead[]; onEdit: (l: Lead) => void; onConvert: (l: Lead) => void }) {
  const [page, setPage] = useState(1);
  const totalPages = Math.max(1, Math.ceil(leads.length / PAGE_SIZE));
  const current = Math.min(page, totalPages);
  const offset = (current - 1) * PAGE_SIZE;
  const rows = leads.slice(offset, offset + PAGE_SIZE);

  return (
    <>
      <div className="mt-4">
        <Table
          id="prospects"
          rows={rows}
          rowId={(l) => `prospect-${l.id}`}
          emptyMessage="Nenhum lead encontrado"
          col={[
            {
              label: "Criança / Idade",
              render: (l) => (
                <div>
                  <p className="font-bold text-brand-purple-dark">{l.child}</p>
                  <p className="text-sm text-brand-purple-dark/60">{l.age ? `${l.age} anos` : "Idade não informada"}</p>
                </div>
              ),
            },
            {
              label: "Responsável",
              render: (l) => (
                <div>
                  <p className="font-bold text-brand-purple-dark">{guardianOf(l).name || "—"}</p>
                  <p className="text-sm text-brand-purple-dark/60">{guardianOf(l).phone}</p>
                </div>
              ),
            },
            { label: "Suporte", render: (l) => <Tag item={l.support || "A definir"} variant="brand" className="rounded-full px-3 py-1" /> },
            { label: "Int. unidade", render: (l) => l.prefUnit || "-" },
            { label: "Status", render: (l) => <StageTag id={l.status} /> },
            { label: "Atualizado em", render: (l) => <span title={fmtBR(l.updatedAt)}>{fmtBR(l.updatedAt)}</span> },
            { label: "Ações", render: (l) => <Actions lead={l} onEdit={() => onEdit(l)} onConvert={() => onConvert(l)} /> },
          ]}
        />
      </div>

      <div className="mt-4 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <MetaInfo meta={{ totalCount: leads.length, currentOffset: offset, pageSize: PAGE_SIZE }} />
        <Pagination meta={{ currentPage: current, totalPages }} onPaginate={setPage} />
      </div>
    </>
  );
}

function Actions({ lead, onEdit, onConvert }: { lead: Lead; onEdit: () => void; onConvert: () => void }) {
  const convertible = lead.status !== "perdido" && lead.status !== "desqualificado";
  return (
    <Dropdown
      id={`prospect-actions-${lead.id}`}
      placement="bottom-end"
      items={
        <>
          <DropdownButton icon="fa-pen-to-square" label="Editar" onClick={onEdit} />
          <DropdownButton icon="fa-user-check" label="Efetivar Paciente" disabled={!convertible} onClick={onConvert} />
        </>
      }
    >
      <button
        type="button"
        className="flex size-8 items-center justify-center rounded-lg text-brand-purple-dark/70 transition-colors hover:bg-brand-purple-dark/10 hover:text-brand-purple-dark"
        title="Ações"
      >
        <Icon name="fa-ellipsis-vertical" className="text-lg" />
      </button>
    </Dropdown>
  );
}

/** `prospect_live/index.ex` → `dropdown_button/1`. */
function DropdownButton({ icon, label, disabled = false, onClick }: { icon: string; label: string; disabled?: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      title={label}
      disabled={disabled}
      onClick={onClick}
      className={cx(
        "flex w-full items-center gap-3 rounded-sm p-2 text-left font-semibold transition-colors",
        disabled ? "cursor-not-allowed text-brand-purple-dark/30" : "text-brand-purple-dark/70 hover:bg-brand-purple-dark/10 hover:text-brand-purple-dark",
      )}
    >
      <Icon name={icon} />
      <span>{label}</span>
    </button>
  );
}
