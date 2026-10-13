/**
 * Aba Relatórios do paciente · v2 — a lista única (`PatientReportsTabV2`).
 * Previstos pela rotina, solicitações e emitidos numa só tabela, com filtros.
 */
import { useState, type ReactNode } from "react";
import { Button } from "../../components/Button.js";
import { Icon } from "../../components/Icon.js";
import { CustomSelect, Input } from "../../components/Input.js";
import { EmptyStateCard, Header, MetaInfo } from "../../components/Layout.js";
import { MultiSelect } from "../../components/MultiSelect.js";
import { DropdownMenu } from "../../components/Overlay.js";
import { Pagination } from "../../components/Pagination.js";
import { Table } from "../../components/Table.js";
import { Tooltip } from "../../components/Choice.js";
import {
  EMPTY_FILTERS,
  LIST_STATUS,
  LIST_STATUS_ORDER,
  REL_PROFS,
  REL_TYPES,
  buildRows,
  filterRows,
  hasFilters,
  relProfById,
  shareState,
  shareable,
  signProgress,
  type ListRow,
  type ListStatus,
  type Report,
  type ReportTypeId,
} from "./model.js";
import { DueCell, FamilyCell, NameCell, PersonCell, ReportStatusBadge, SubLine } from "./parts.js";
import { useReports } from "./store.js";

/** Tamanho de página da lista (o `default_limit` de `ReportControl`). */
const PAGE_SIZE = 10;

type RowAction = { label: string; icon: string; danger?: boolean; run: () => void };

/** Botão só de ícone com dica (`rel-iconbtn` + `data-tip`). */
function IconAction({ id, label, icon, primary, onClick }: { id: string; label: string; icon: string; primary?: boolean; onClick: () => void }) {
  return (
    <Tooltip
      id={id}
      placement="top"
      tooltipTrigger={
        <Button type="button" size="small" variant={primary ? "tint" : "ghost"} aria-label={label} onClick={onClick}>
          <Icon name={icon} type="solid" />
        </Button>
      }
      tooltipContent={label}
    />
  );
}

export function ReportsList() {
  const store = useReports();
  const { patient, reports, forecast, filters, setFilters, toReport, openModal } = store;
  const [page, setPage] = useState(1);

  const mine = reports.filter((r) => r.patient.id === patient.id || r.patient.name === patient.name);
  const rows = buildRows(forecast, mine);
  const list = filterRows(rows, filters);
  const lateN = rows.filter((x) => x.late).length;
  const totalPages = Math.max(1, Math.ceil(list.length / PAGE_SIZE));
  const current = Math.min(page, totalPages);
  const paged = list.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE);

  const update = (patch: Partial<typeof filters>) => {
    setFilters({ ...filters, ...patch });
    setPage(1);
  };

  /* opções dos filtros */
  const typeOpts = REL_TYPES.filter((t) => rows.some((x) => x.typeId === t.id)).map((t) => ({ id: t.id, label: t.name }));
  const statusOpts = [
    { id: "late", label: "Em atraso", details: String(lateN) },
    ...LIST_STATUS_ORDER.map((id) => ({ id, label: LIST_STATUS[id].label })),
  ];
  const yearOpts = [...new Set(rows.map((x) => x.year).filter(Boolean))].sort().reverse().map((y) => ({ label: y, value: y }));
  const profOpts = [
    ...REL_PROFS.filter((p) => rows.some((x) => x.profId === p.id)).map((p) => ({ label: p.name, value: p.id })),
    ...(rows.some((x) => x.profId === "none") ? [{ label: "Sem responsável", value: "none" }] : []),
  ];

  /* a própria linha abre o relatório; aqui só o que vai além de "ver" */
  function rowActions(r: Report): RowAction[] {
    if (r.status === "assinaturas") return [{ label: "Ver assinaturas", icon: "fa-signature", run: () => toReport(r.id) }];
    if (r.status !== "finalizado") return [];
    const st = shareState(r);
    const out: RowAction[] = [{ label: "Baixar PDF", icon: "fa-download", run: () => store.download(r) }];
    if (shareable(r) && (st === "none" || st === "revoked"))
      out.push({ label: "Compartilhar com família", icon: "fa-share-nodes", run: () => openModal({ kind: "share", id: r.id }) });
    if (st === "pending" || st === "partial") out.push({ label: "Reenviar para família", icon: "fa-bell", run: () => store.remind(r) });
    if (st === "pending" || st === "partial" || st === "viewed")
      out.push({ label: "Cancelar compartilhamento", icon: "fa-ban", danger: true, run: () => store.revoke(r) });
    return out;
  }

  function actionsCell(x: ListRow): ReactNode {
    if (x.fc) {
      return <IconAction id={`solicitar-${x.key}`} label="Solicitar relatório" icon="fa-plus" primary onClick={() => store.requestForecast(x.fc)} />;
    }
    const r = x.r;
    const acts = rowActions(r);
    if (acts.length === 0) {
      const label = x.status === "finalizado" ? "Ver relatório" : "Ver solicitação";
      return <IconAction id={`ver-${r.id}`} label={label} icon="fa-eye" onClick={() => toReport(r.id)} />;
    }
    if (acts.length === 1) {
      const a = acts[0]!;
      return <IconAction id={`acao-${r.id}`} label={a.label} icon={a.icon} onClick={a.run} />;
    }
    const all: RowAction[] = [{ label: "Ver relatório", icon: "fa-file-lines", run: () => toReport(r.id) }, ...acts];
    return (
      <DropdownMenu
        id={`menu-${r.id}`}
        items={all.map((a) => (
          <Button type="button" variant="ghost" leftIcon={a.icon} iconType="solid" className={a.danger ? "text-red" : undefined} onClick={a.run}>
            {a.label}
          </Button>
        ))}
      />
    );
  }

  function statusSub(x: ListRow): ReactNode {
    if (x.fc) return x.fc.auto ? <SubLine icon="fa-solid fa-robot">{x.fc.auto.replace("Criação automática", "Será solicitado automaticamente")}</SubLine> : null;
    const r = x.r;
    if (r.status === "assinaturas") {
      const p = signProgress(r);
      return <SubLine>{`${p.done} de ${p.total} assinaturas concluídas`}</SubLine>;
    }
    if (r.status === "em_andamento" && r.hasDraft) return <SubLine>Rascunho salvo</SubLine>;
    if (r.status === "cancelado") return <SubLine>{`em ${r.updatedAt.split(" ")[0]}`}</SubLine>;
    return null;
  }

  function personCell(x: ListRow): ReactNode {
    const prof = x.r ? x.r.prof : relProfById(x.fc.profId);
    if (!prof) return <PersonCell />;
    const co = x.r?.coauthors?.length ?? 0;
    return <PersonCell name={prof.name} sub={co ? `${prof.specialty} · +${co} coautor${co === 1 ? "" : "es"}` : prof.specialty} />;
  }

  /* cancelados ficam esmaecidos, como `.is-cancel` */
  const dim = (x: ListRow, node: ReactNode) => (x.status === "cancelado" ? <div className="opacity-70">{node}</div> : node);

  return (
    <div>
      <Header
        actions={
          <div className="flex flex-col gap-3 sm:flex-row">
            <Button type="button" variant="tint" leftIcon="fa-rotate" iconType="solid" onClick={() => openModal({ kind: "routine" })}>
              Rotina de relatórios
            </Button>
            <Button type="button" rightIcon="fa-plus" iconType="solid" onClick={() => openModal({ kind: "new" })}>
              Solicitar relatório
            </Button>
          </div>
        }
      >
        Relatórios do paciente
      </Header>

      <div className="mt-5 grid grid-cols-1 items-start gap-4 md:grid-cols-3 xl:grid-cols-[minmax(0,1.4fr)_repeat(4,minmax(0,1fr))]">
        <Input
          id="relatorios-busca"
          label="Busca"
          placeholder="Relatório ou responsável"
          rightIcon="fa-magnifying-glass"
          value={filters.q}
          onChange={(event) => update({ q: event.target.value })}
        />
        <MultiSelect
          id="relatorios-tipo"
          label="Tipo"
          prompt="Todos"
          options={typeOpts}
          field={{ id: "relatorios-tipo", name: "filtro[tipo]", value: filters.type }}
          onChange={(ids) => update({ type: ids as ReportTypeId[] })}
        />
        <MultiSelect
          id="relatorios-status"
          label="Status"
          prompt="Todos"
          options={statusOpts}
          field={{ id: "relatorios-status", name: "filtro[status]", value: [...(filters.late ? ["late"] : []), ...filters.status] }}
          onChange={(ids) => update({ late: ids.includes("late"), status: ids.filter((id) => id !== "late") as ListStatus[] })}
        />
        <CustomSelect
          id="relatorios-periodo"
          label="Período"
          prompt="Todos"
          options={yearOpts}
          value={filters.year}
          onChange={(value) => update({ year: value ?? "" })}
        />
        <CustomSelect
          id="relatorios-responsavel"
          label="Responsável"
          prompt="Todos"
          options={profOpts}
          value={filters.prof}
          onChange={(value) => update({ prof: value ?? "" })}
        />
      </div>

      {hasFilters(filters) && (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Button type="button" variant="ghost" size="small" onClick={() => update(EMPTY_FILTERS)}>
            Limpar filtros
          </Button>
          <span className="ml-auto text-[13px] font-semibold text-brand-purple-dark/55">{`${list.length} relatório${list.length === 1 ? "" : "s"}`}</span>
        </div>
      )}

      <div className="mt-6">
        {list.length === 0 ? (
          <EmptyStateCard
            icon="fa-folder-open"
            text={rows.length === 0 ? `Nenhum relatório para ${patient.name.split(" ")[0]}` : "Nenhum relatório com esses filtros"}
          >
            <p>{rows.length === 0 ? "Solicite um relatório ou configure a rotina do paciente." : "Altere ou limpe os filtros para ver outros relatórios."}</p>
          </EmptyStateCard>
        ) : (
          <>
            <Table
              id="patient-reports"
              rows={paged}
              rowId={(x) => x.key}
              rowClick={(x) => x.r && toReport(x.r.id)}
              col={[
                { label: "Relatório", render: (x) => dim(x, <NameCell row={x} />) },
                { label: "Status", render: (x) => dim(x, <><ReportStatusBadge status={x.status} />{statusSub(x)}</>) },
                { label: "Prazo / emissão", render: (x) => dim(x, <DueCell row={x} />) },
                { label: "Responsável", render: (x) => dim(x, personCell(x)) },
                { label: "Solicitante", render: (x) => dim(x, <span className="text-[13px] whitespace-nowrap text-brand-purple-dark/60">{x.requester}</span>) },
                { label: "Família", render: (x) => dim(x, <FamilyCell row={x} />) },
              ]}
              action={[(x) => <span className="inline-flex justify-end pr-3">{actionsCell(x)}</span>]}
            />
            <div className="mt-4 flex items-center justify-between">
              <MetaInfo meta={{ totalCount: list.length, currentOffset: (current - 1) * PAGE_SIZE, pageSize: PAGE_SIZE }} />
              {totalPages > 1 && <Pagination meta={{ currentPage: current, totalPages }} onPaginate={setPage} />}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
