/**
 * Aba Documentos do profissional · v2 (`ProfDocumentsTabV2`) — substitui
 * `professionals/components/edit_tabs/documents.ex`.
 *
 * Uma área só, com alternância Cards / Tabela. A lista traz os seis documentos
 * padrão, mesmo sem arquivo (ficam "Pendente"), e depois os adicionais.
 */
import { Button } from "../../components/Button.js";
import { RadioSelector } from "../../components/Choice.js";
import { CustomSelect, Input } from "../../components/Input.js";
import { EmptyStateCard, Header } from "../../components/Layout.js";
import { Table } from "../../components/Table.js";
import { Tag } from "../../components/Tag.js";
import {
  EMPTY_FILTERS,
  OPERATORS,
  STATUS_FILTER,
  buildRows,
  counts,
  filterRows,
  hasFilters,
  pluralize,
  rowTitle,
  rowType,
  type DocRow,
  type DocStateKey,
} from "./model.js";
import { DocCard, DocStatusTag, OperatorChips, RowAction, StandardBadge } from "./parts.js";
import { useDocuments, type DocumentsView } from "./store.js";

export function DocumentsTab() {
  const { documents, canEdit, filters, setFilters, view, setView, openModal } = useDocuments();

  const all = buildRows(documents);
  const rows = filterRows(all, filters);
  const kpi = counts(all);
  const update = (patch: Partial<typeof filters>) => setFilters({ ...filters, ...patch });

  const typeOpts = [...new Set(all.map(rowType).filter(Boolean))].map((t) => ({ label: t, value: t }));
  const opOpts = OPERATORS.filter((o) => documents.some((d) => d.sharedWith.includes(o.id))).map((o) => ({ label: o.name, value: o.id }));

  const action = (r: DocRow) => (
    <RowAction
      row={r}
      canEdit={canEdit}
      onAttach={() => openModal({ kind: "attach", typeId: r.slot!.typeId })}
      onEdit={() => openModal({ kind: "edit", id: r.doc!.id })}
    />
  );

  return (
    <div>
      <Header
        actions={
          <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center">
            <RadioSelector
              field={{ id: "documentos-visualizacao", name: "visualizacao", value: view }}
              className="flex"
              radio={[
                { value: "cards", icon: "fa-grip", title: "Cards" },
                { value: "table", icon: "fa-list", title: "Tabela" },
              ]}
              onChange={(event) => setView(event.target.value as DocumentsView)}
            />
            <Button type="button" variant="tint" rightIcon="fa-file-pdf" onClick={() => openModal({ kind: "bundle" })}>
              Exportar agrupado
            </Button>
            {canEdit && (
              <Button type="button" rightIcon="fa-plus" iconType="solid" onClick={() => openModal({ kind: "add" })}>
                Adicionar documento
              </Button>
            )}
          </div>
        }
      >
        Documentos
      </Header>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <Tag pill item={pluralize(kpi.pending, "pendente", "pendentes")} variant="yellow" />
        <Tag pill item={pluralize(kpi.active, "ativo", "ativos")} variant="green" />
        <Tag pill item={`${kpi.expiring} a vencer`} variant="orange" />
        <Tag pill item={pluralize(kpi.expired, "vencido", "vencidos")} variant="red" />
      </div>

      <div className="mt-5 grid grid-cols-1 items-start gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Input
          id="documentos-nome"
          label="Nome"
          placeholder="Buscar por nome"
          rightIcon="fa-magnifying-glass"
          value={filters.name}
          onChange={(event) => update({ name: event.target.value })}
        />
        <CustomSelect id="documentos-tipo" label="Tipo" prompt="Todos" options={typeOpts} value={filters.type} onChange={(v) => update({ type: v ?? "" })} />
        <CustomSelect
          id="documentos-status"
          label="Status"
          prompt="Todos"
          options={STATUS_FILTER}
          value={filters.status}
          onChange={(v) => update({ status: (v ?? "") as DocStateKey | "" })}
        />
        <CustomSelect
          id="documentos-operadora"
          label="Operadora"
          prompt="Todas"
          options={opOpts}
          value={filters.operator}
          onChange={(v) => update({ operator: v ?? "" })}
        />
      </div>

      {hasFilters(filters) && (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Button type="button" variant="ghost" size="small" onClick={() => setFilters(EMPTY_FILTERS)}>
            Limpar filtros
          </Button>
          <span className="ml-auto text-[13px] font-semibold text-brand-purple-dark/55">{pluralize(rows.length, "documento", "documentos")}</span>
        </div>
      )}

      <div className="mt-6">
        {rows.length === 0 ? (
          <EmptyStateCard icon="fa-folder-open" text="Nenhum documento corresponde aos filtros">
            <p>Altere ou limpe os filtros para ver os outros documentos.</p>
          </EmptyStateCard>
        ) : view === "cards" ? (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {rows.map((r) => (
              <DocCard key={r.key} row={r} action={action(r)} />
            ))}
          </div>
        ) : (
          <Table
            id="professional-documents"
            rows={rows}
            rowId={(r) => r.key}
            emptyMessage="Nenhum documento cadastrado."
            col={[
              {
                label: "Documento",
                render: (r) => (
                  <div className={r.doc ? undefined : "opacity-60"}>
                    <p className="flex flex-wrap items-center gap-2 font-bold text-brand-purple-dark">
                      {rowTitle(r)}
                      {r.standard && <StandardBadge />}
                    </p>
                    <p className="mt-0.5 text-xs text-brand-purple-dark/55">
                      {r.doc ? `${r.doc.file}` : "sem arquivo anexado"}
                    </p>
                  </div>
                ),
              },
              { label: "Nº", className: "whitespace-nowrap", render: (r) => r.doc?.number || "—" },
              { label: "Atualizado", render: (r) => r.doc?.updatedAt ?? "—" },
              { label: "Validade", render: (r) => r.doc?.validUntil ?? "—" },
              { label: "Status", render: (r) => <DocStatusTag doc={r.doc} /> },
              {
                label: "Compartilhado com",
                render: (r) => (r.doc ? <OperatorChips doc={r.doc} /> : <span className="text-sm italic text-brand-purple-dark/50">Não compartilhado</span>),
              },
            ]}
            action={[(r) => <span className="inline-flex justify-end pr-3">{action(r)}</span>]}
          />
        )}
      </div>
    </div>
  );
}
