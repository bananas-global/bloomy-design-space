import { useEffect, useMemo, useState, type ReactNode } from "react";
import type { ScreenProps } from "@brucesantos/design-space";
import type {
  ManagementApplicatorRow,
  ManagementClinicalOwnerRow,
  ManagementData,
  ManagementInterventionPlanRow,
  ManagementLists,
  ManagementPatient,
  ManagementPerson,
  ManagementRegistrationRow,
  ManagementSupervisorRow,
  ManagementTab,
  ReportControl,
} from "../contracts/index.js";
import { AppShell } from "../components/AppShell.js";
import { EmptyState, ErrorState, LoadingState } from "../components/primitives.js";
import { Icon } from "../components/Icon.js";
import { Button } from "../components/bloomy/Button.js";
import { Card } from "../components/bloomy/Card.js";
import { Input, Select, Switch } from "../components/bloomy/Input.js";
import { Modal } from "../components/bloomy/Overlay.js";
import { Table } from "../components/bloomy/Table.js";
import { Tag, TagList } from "../components/bloomy/Tag.js";
import { LazyTabs, type LazyTabEntry } from "../components/bloomy/Tabs.js";
import {
  canOpenManagement,
  isOverdue,
  reportTypeLabel,
  requesterLabel,
} from "../rules/management.js";

/**
 * Listas gerenciais — espelho de `/backoffice/gerencia`.
 *
 * A captura mais conhecida mostra só a primeira aba, mas o LiveView monta onze
 * componentes irmãos dentro do mesmo `button_tabs`. A proposta reorganiza
 * essas filas com o `lazy_tabs` que já existe no perfil do paciente: grupos
 * contextuais, filtros próprios em cada opção, tabela densa e edição em diálogo.
 * Não há resumo ou dashboard antes das listas no sistema real.
 *
 * Origem: `lib/bloomy_web/backoffice/live/management/index.ex:10-194`.
 */

const TABS: { id: ManagementTab; label: string }[] = [
  { id: "supervisors", label: "Supervisores" },
  { id: "applicators", label: "Aplicadores" },
  { id: "clinical-owners", label: "Responsáveis Clínicos" },
  { id: "patient-registration", label: "Cadastro de Pacientes" },
  { id: "professional-registration", label: "Cadastro de Profissionais" },
  { id: "authorizations", label: "Autorizações" },
  { id: "professionals-by-specialty", label: "Profissionais por Especialidade" },
  { id: "hour-maps", label: "Mapa de Horas" },
  { id: "report-control", label: "Controle de Relatórios" },
  { id: "absences", label: "Faltas Profissionais" },
  { id: "intervention-plans", label: "Planos terapêuticos" },
];

const MANAGEMENT_GROUPS: { id: string; label: string; tabs: ManagementTab[] }[] = [
  {
    id: "operation",
    label: "Operação",
    tabs: ["patient-registration", "professional-registration", "authorizations"],
  },
  { id: "agenda", label: "Agenda", tabs: ["hour-maps", "absences"] },
  {
    id: "care",
    label: "Assistencial",
    tabs: ["supervisors", "applicators", "clinical-owners", "intervention-plans"],
  },
  {
    id: "reports",
    label: "Relatórios",
    tabs: ["professionals-by-specialty", "report-control"],
  },
];

const MANAGEMENT_LAZY_TABS: LazyTabEntry<ManagementTab>[] = MANAGEMENT_GROUPS.map((group) => ({
  id: group.id,
  label: group.label,
  tabs: group.tabs.flatMap((tabId) => {
    const tab = TABS.find((item) => item.id === tabId);
    return tab ? [tab] : [];
  }),
}));

type ModalState =
  | { kind: "supervisor"; row: ManagementSupervisorRow }
  | { kind: "applicator"; row: ManagementApplicatorRow }
  | { kind: "clinical-owner"; row: ManagementClinicalOwnerRow }
  | { kind: "report" }
  | null;

type FilterState = {
  query: string;
  specialty: string;
  status: string;
  missing: string;
  patient: string;
  professional: string;
  dueDate: string;
  period: string;
};

const EMPTY_FILTERS: FilterState = {
  query: "",
  specialty: "",
  status: "active",
  missing: "",
  patient: "",
  professional: "",
  dueDate: "",
  period: "2026-05-05#2026-08-03",
};

function initialFilters(tab: ManagementTab): FilterState {
  return {
    ...EMPTY_FILTERS,
    status:
      tab === "hour-maps"
        ? "without_active"
        : tab === "report-control" || tab === "intervention-plans" || tab === "authorizations"
          ? ""
          : "active",
  };
}

const EMPTY_LISTS: ManagementLists = {
  supervisors: [],
  applicators: [],
  clinicalOwners: [],
  patientRegistration: [],
  professionalRegistration: [],
  authorizations: [],
  professionalsBySpecialty: [],
  hourMaps: [],
  reportControls: [],
  absences: [],
  interventionPlans: [],
};

export function Management({ context }: ScreenProps) {
  const { data, isLoading, error, permissions } = context;

  if (isLoading) return wrap(context, <LoadingState label="Carregando as listas gerenciais" />);
  if (error) return wrap(context, <ErrorState message={error.message} />);

  const access = canOpenManagement(permissions);
  if (!access.allowed) {
    return wrap(
      context,
      <EmptyState
        title="Você não tem acesso às listas gerenciais"
        description="As listas gerenciais são de Admin, Admin de Clínica e Coordenador. Fale com quem administra os acessos da unidade."
      />,
    );
  }

  const management = data as ManagementData | null;
  if (!management) return wrap(context, <ErrorState message="Não foi possível carregar." />);

  return <ManagementContent context={context} management={management} />;
}

function ManagementContent({
  context,
  management,
}: {
  context: ScreenProps["context"];
  management: ManagementData;
}) {
  const [activeTab, setActiveTab] = useState<ManagementTab>(management.activeTab ?? "supervisors");
  const [filters, setFilters] = useState<FilterState>(initialFilters(management.activeTab ?? "supervisors"));
  const [modal, setModal] = useState<ModalState>(null);
  const [announcement, setAnnouncement] = useState("");
  const lists = management.lists ?? listsFromLegacyFixture(management);

  useEffect(() => {
    setActiveTab(management.activeTab ?? "supervisors");
    setFilters(initialFilters(management.activeTab ?? "supervisors"));
    setModal(null);
  }, [management]);

  function chooseTab(tab: ManagementTab) {
    setActiveTab(tab);
    setFilters(initialFilters(tab));
    setAnnouncement(`${TABS.find((item) => item.id === tab)?.label} aberta.`);
  }

  function updateFilter(name: keyof FilterState, value: string) {
    setFilters((current) => ({ ...current, [name]: value }));
  }

  function finishModal(message: string) {
    setModal(null);
    setAnnouncement(message);
  }

  return wrap(
    context,
    <div className="espelho-do-sistema">
      <LazyTabs
        id="management-tabs"
        label="Listas gerenciais"
        tabs={MANAGEMENT_LAZY_TABS}
        value={activeTab}
        onChange={chooseTab}
      >
        <Card className="space-y-6">
          <ManagementFilters
            tab={activeTab}
            filters={filters}
            lists={lists}
            onChange={updateFilter}
            onRequestReport={() => setModal({ kind: "report" })}
          />

          <ManagementTable
            tab={activeTab}
            filters={filters}
            lists={lists}
            now={management.now}
            onEditSupervisor={(row) => setModal({ kind: "supervisor", row })}
            onEditApplicator={(row) => setModal({ kind: "applicator", row })}
            onEditClinicalOwner={(row) => setModal({ kind: "clinical-owner", row })}
            onOpenRecord={(kind) => {
              setAnnouncement(`${kind === "patient" ? "Cadastro do paciente" : "Cadastro do profissional"} aberto em nova referência.`);
            }}
          />
        </Card>
      </LazyTabs>

      <p className="sr-only" role="status" aria-live="polite">{announcement}</p>
      <ManagementModal
        state={modal}
        lists={lists}
        onClose={() => setModal(null)}
        onSave={finishModal}
      />
    </div>,
    management,
  );
}

function ManagementFilters({
  tab,
  filters,
  lists,
  onChange,
  onRequestReport,
}: {
  tab: ManagementTab;
  filters: FilterState;
  lists: ManagementLists;
  onChange: (name: keyof FilterState, value: string) => void;
  onRequestReport: () => void;
}) {
  const specialties = useMemo(
    () => Array.from(new Set([
      ...lists.supervisors.map((row) => row.professional.specialty),
      ...lists.applicators.map((row) => row.professional.specialty),
      ...lists.professionalsBySpecialty.map((row) => row.specialty),
    ].filter((value): value is string => Boolean(value)))).sort(),
    [lists],
  );

  if (tab === "professionals-by-specialty") {
    return (
      <FilterGrid>
        <SelectField label="Especialidade" value={filters.specialty} onChange={(value) => onChange("specialty", value)} options={["Selecione a especialidade", ...specialties]} />
      </FilterGrid>
    );
  }

  if (tab === "hour-maps") {
    return (
      <FilterGrid>
        <SelectField label="Status" value={filters.status} onChange={(value) => onChange("status", value)} options={["Sem padrão|without_active", "Em vigência|active", "Aguardando|waiting", "Encerrado|finished", "Pendente|pending", "Cancelado|cancelled", "15 dias do vencimento|expiring"]} />
        <SelectField label="Paciente" value={filters.patient} onChange={(value) => onChange("patient", value)} options={["Selecionar paciente", ...patientNames(lists)]} />
        <Input id="management-period" label="Período" value={filters.period} onChange={(event) => onChange("period", event.target.value)} placeholder="AAAA-MM-DD#AAAA-MM-DD" />
      </FilterGrid>
    );
  }

  if (tab === "report-control") {
    return (
      <FilterGrid className="lg:grid-cols-[repeat(4,minmax(0,1fr))_auto]">
        <SelectField label="Paciente" value={filters.patient} onChange={(value) => onChange("patient", value)} options={["Selecionar paciente", ...patientNames(lists)]} />
        <SelectField label="Profissional" value={filters.professional} onChange={(value) => onChange("professional", value)} options={["Selecione o profissional", ...professionalNames(lists)]} />
        <SelectField label="Status" value={filters.status} onChange={(value) => onChange("status", value)} options={["Todos", "Não iniciado|not_started", "Em andamento|in_progress", "Concluído|completed", "Cancelado|cancelled"]} />
        <Input id="management-due-date" label="Prazo" type="date" value={filters.dueDate} onChange={(event) => onChange("dueDate", event.target.value)} />
        <div className="self-end"><Button className="espelho-do-sistema w-full" rightIcon="fa-plus" onClick={onRequestReport}>Solicitar relatório</Button></div>
      </FilterGrid>
    );
  }

  if (tab === "absences") {
    return (
      <FilterGrid>
        <Input id="management-absence-period" label="Período" value={filters.period} onChange={(event) => onChange("period", event.target.value)} placeholder="AAAA-MM-DD#AAAA-MM-DD" />
        <SelectField label="Profissional" value={filters.professional} onChange={(value) => onChange("professional", value)} options={["Selecione o profissional", ...professionalNames(lists)]} />
        <SelectField label="Especialidade" value={filters.specialty} onChange={(value) => onChange("specialty", value)} options={["Selecione a especialidade", ...specialties]} />
      </FilterGrid>
    );
  }

  if (tab === "intervention-plans") {
    return (
      <FilterGrid>
        <SelectField label="Paciente" value={filters.patient} onChange={(value) => onChange("patient", value)} options={["Selecionar paciente", ...patientNames(lists)]} />
        <SelectField label="Profissional" value={filters.professional} onChange={(value) => onChange("professional", value)} options={["Selecione o profissional", ...professionalNames(lists)]} />
        <SelectField label="Status" value={filters.status} onChange={(value) => onChange("status", value)} options={["Todos", "Vigente|active", "Pendente|pending", "Expirado|expired"]} />
      </FilterGrid>
    );
  }

  if (tab === "authorizations") {
    return (
      <FilterGrid>
        <Input id="management-search" label="Buscar" value={filters.query} onChange={(event) => onChange("query", event.target.value)} placeholder="Paciente" rightIcon="fa-search" />
        <SelectField label="Status" value={filters.status} onChange={(value) => onChange("status", value)} options={["Selecionar", "Em Vigência|active", "Vencido|expired"]} />
      </FilterGrid>
    );
  }

  if (tab === "clinical-owners") {
    return (
      <FilterGrid>
        <Input id="management-search" label="Buscar" value={filters.query} onChange={(event) => onChange("query", event.target.value)} placeholder="Paciente" rightIcon="fa-search" />
        <SelectField label="Status" value={filters.status} onChange={(value) => onChange("status", value)} options={["Selecione o status", "Ativo|active", "Inativo|inactive"]} />
      </FilterGrid>
    );
  }

  if (tab === "patient-registration") {
    return (
      <FilterGrid>
        <Input id="management-search" label="Buscar" value={filters.query} onChange={(event) => onChange("query", event.target.value)} placeholder="Paciente" rightIcon="fa-search" />
        <SelectField label="Itens faltantes" value={filters.missing} onChange={(value) => onChange("missing", value)} options={["Selecionar", "Plano de Saúde", "Vínculo de Unidade", "Nível de Suporte", "Mapa de Horas"]} />
        <SelectField label="Status" value={filters.status} onChange={(value) => onChange("status", value)} options={["Selecione o status", "Ativo|active", "Inativo|inactive"]} />
      </FilterGrid>
    );
  }

  if (tab === "professional-registration") {
    return (
      <FilterGrid className="lg:grid-cols-4">
        <Input id="management-search" label="Buscar" value={filters.query} onChange={(event) => onChange("query", event.target.value)} placeholder="Profissional" rightIcon="fa-search" />
        <SelectField label="Especialidade" value={filters.specialty} onChange={(value) => onChange("specialty", value)} options={["Selecione a especialidade", ...specialties]} />
        <SelectField label="Itens faltantes" value={filters.missing} onChange={(value) => onChange("missing", value)} options={["Selecionar", "Vínculo de Unidade", "Escala", "Contrato"]} />
        <SelectField label="Status" value={filters.status} onChange={(value) => onChange("status", value)} options={["Selecione o status", "Ativo|active", "Inativo|inactive"]} />
      </FilterGrid>
    );
  }

  return (
    <FilterGrid>
      <Input id="management-search" label="Buscar" value={filters.query} onChange={(event) => onChange("query", event.target.value)} placeholder="Nome" rightIcon="fa-search" />
      <SelectField label="Especialidade" value={filters.specialty} onChange={(value) => onChange("specialty", value)} options={["Selecione a especialidade", ...specialties]} />
      <SelectField label="Status profissional" value={filters.status} onChange={(value) => onChange("status", value)} options={["Selecione o status", "Ativo|active", "Inativo|inactive"]} />
    </FilterGrid>
  );
}

function ManagementTable({
  tab,
  filters,
  lists,
  now,
  onEditSupervisor,
  onEditApplicator,
  onEditClinicalOwner,
  onOpenRecord,
}: {
  tab: ManagementTab;
  filters: FilterState;
  lists: ManagementLists;
  now: string;
  onEditSupervisor: (row: ManagementSupervisorRow) => void;
  onEditApplicator: (row: ManagementApplicatorRow) => void;
  onEditClinicalOwner: (row: ManagementClinicalOwnerRow) => void;
  onOpenRecord: (kind: "patient" | "professional") => void;
}) {
  if (tab === "supervisors") {
    const rows = lists.supervisors.filter((row) => personMatches(row.professional, filters));
    return <TableWithMeta id="professional_supervisor_table" rows={rows} rowId={(row) => row.professional.id} cols={[
      { label: "Status", className: "w-10", render: (row) => <StatusDot active={row.professional.active} /> },
      { label: "Supervisor", render: (row) => <PersonCell person={row.professional} /> },
      { label: "Aplicadores", render: (row) => row.applicatorCount },
      { label: "Ações", className: "w-24", render: (row) => <IconAction label={`Editar Aplicadores de ${row.professional.name}`} icon="fa-pen" onClick={() => onEditSupervisor(row)} /> },
    ]} />;
  }

  if (tab === "applicators") {
    const rows = lists.applicators.filter((row) => personMatches(row.professional, filters));
    return <TableWithMeta id="mentorships_table" rows={rows} rowId={(row) => row.id} cols={[
      { label: "Status", className: "w-10", render: (row) => <StatusDot active={row.professional.active} /> },
      { label: "Aplicadores", render: (row) => <PersonCell person={row.professional} /> },
      { label: "Supervisor", render: (row) => <PersonCell person={row.supervisor} /> },
      { label: "Assina", render: (row) => <Tag item={row.needsSupervisorSignature ? "Sim" : "Não"} variant={row.needsSupervisorSignature ? "green" : "red"} /> },
      { label: "Ações", className: "w-24", render: (row) => <IconAction label={`Editar supervisor de ${row.professional.name}`} icon="fa-pen" onClick={() => onEditApplicator(row)} /> },
    ]} />;
  }

  if (tab === "clinical-owners") {
    const rows = lists.clinicalOwners.filter((row) => patientMatches(row.patient, filters));
    return <TableWithMeta id="patient_management" rows={rows} rowId={(row) => row.patient.id} cols={[
      { label: "Status", className: "w-10", render: (row) => <StatusDot active={row.patient.active} /> },
      { label: "Paciente", render: (row) => <PatientCell patient={row.patient} /> },
      { label: "Responsável", render: (row) => row.responsible ? <PersonCell person={row.responsible} /> : <span>—</span> },
      { label: "Ações", className: "w-28", render: (row) => <div className="flex gap-3"><IconAction label={`Editar responsáveis de ${row.patient.name}`} icon="fa-pen" onClick={() => onEditClinicalOwner(row)} /><IconAction label={`Abrir cadastro de ${row.patient.name}`} icon="fa-arrow-up-right-from-square" onClick={() => onOpenRecord("patient")} /></div> },
    ]} />;
  }

  if (tab === "patient-registration" || tab === "professional-registration") {
    const source = tab === "patient-registration" ? lists.patientRegistration : lists.professionalRegistration;
    const rows = source.filter((row) => registrationMatches(row, filters));
    const isPatient = tab === "patient-registration";
    return <TableWithMeta id={isPatient ? "register_missing_patient" : "missing_professionals"} rows={rows} rowId={(row) => row.person.id} cols={[
      { label: "Status", className: "w-10", render: (row) => <StatusDot active={row.person.active} /> },
      { label: isPatient ? "Paciente" : "Profissional", render: (row) => isPatient ? <PatientCell patient={row.person as ManagementPatient} /> : <PersonCell person={{ ...row.person, specialty: row.specialty }} /> },
      { label: "Itens faltantes", render: (row) => <TagList items={row.missing} variant="red" /> },
      { label: "Ações", className: "w-20", render: (row) => <IconAction label={`Abrir cadastro de ${row.person.name}`} icon="fa-arrow-up-right-from-square" onClick={() => onOpenRecord(isPatient ? "patient" : "professional")} /> },
    ]} />;
  }

  if (tab === "authorizations") {
    const rows = lists.authorizations.filter((row) => textMatches(row.patient.name, filters.query) && statusMatches(row.status, filters.status));
    return <TableWithMeta id="authorizations_table" rows={rows} rowId={(row) => row.id} cols={[
      { label: "Paciente", render: (row) => <PatientCell patient={row.patient} /> },
      { label: "Data de Vencimento", render: (row) => formatIsoDate(row.durationEndAt) },
      { label: "Status", render: (row) => <Tag item={row.status === "active" ? "Em Vigência" : "Vencido"} variant={row.status === "active" ? "green" : "red"} /> },
    ]} />;
  }

  if (tab === "professionals-by-specialty") {
    const rows = lists.professionalsBySpecialty.filter((row) => !filters.specialty || row.specialty === filters.specialty);
    return <TableWithMeta id="professionals_by_specialty" rows={rows} rowId={(row) => row.specialty} cols={[
      { label: "Especialidade", render: (row) => <strong>{row.specialty}</strong> },
      { label: "Total", render: (row) => row.total },
      { label: "Coordenadores", render: (row) => row.coordinators },
      { label: "Supervisores", render: (row) => row.supervisors },
      { label: "Terapeutas", render: (row) => row.therapists },
      { label: "Aplicadores", render: (row) => row.applicators },
      { label: "Em formação", render: (row) => row.trainees },
    ]} />;
  }

  if (tab === "hour-maps") {
    const rows = lists.hourMaps.filter((row) => {
      const byPatient = !filters.patient || row.patient.name === filters.patient;
      const byStatus = filters.status === "without_active" ? !row.status : !filters.status || normalizeHourMapStatus(row.status) === filters.status;
      return byPatient && byStatus;
    });
    return <TableWithMeta id="hour_maps_table" rows={rows} rowId={(row) => row.id} cols={[
      { label: "Paciente", render: (row) => <PatientCell patient={row.patient} /> },
      { label: "Vigência", render: (row) => row.durationStartAt && row.durationEndAt ? <div><strong className="block">De {formatIsoDate(row.durationStartAt)}</strong><span>Até {formatIsoDate(row.durationEndAt)}</span></div> : <span>—</span> },
      { label: "Horas Semanais", render: (row) => row.weeklyHours ?? "—" },
      { label: "Status", render: (row) => row.status ? <Tag item={row.status} variant={hourMapVariant(row.status)} /> : <span>—</span> },
    ]} />;
  }

  if (tab === "report-control") {
    const rows = managementReports(lists, filters);
    return <TableWithMeta id="report_controls" rows={rows} rowId={(row) => row.id} cols={[
      { label: "Paciente", render: (row) => <PersonName name={row.patientName} /> },
      { label: "Tipo", render: (row) => <strong>{reportTypeLabel(row.reportType)}</strong> },
      { label: "Solicitante", render: (row) => requesterLabel(row.requester) },
      { label: "Profissional", render: (row) => <PersonName name={row.professionalName} /> },
      { label: "Prazo", render: (row) => <span className={isOverdue(row, now) ? "font-bold text-[var(--color-red)]" : ""}>{formatIsoDate(row.dueDate)}{isOverdue(row, now) && <span className="sr-only">, vencido</span>}</span> },
      { label: "Status", render: (row) => <Tag item={reportStatusLabel(row.status)} variant={reportStatusVariant(row.status)} /> },
      { label: "Ações", className: "w-20", render: (row) => <IconAction label={`Mais ações para o relatório de ${row.patientName}`} icon="fa-ellipsis-vertical" onClick={() => undefined} /> },
    ]} />;
  }

  if (tab === "absences") {
    const rows = lists.absences.filter((row) => (!filters.professional || row.professional.name === filters.professional) && (!filters.specialty || row.professional.specialty === filters.specialty));
    return <TableWithMeta id="absence_professionals" rows={rows} rowId={(row) => row.professional.id} cols={[
      { label: "Profissional", render: (row) => <PersonCell person={row.professional} /> },
      { label: "Faltas (dias/horas)", render: (row) => <div><strong className={row.missingDays > 0 ? "block text-[var(--color-red)]" : "block text-[var(--color-green-dark)]"}>{row.missingDays} dias</strong><span className="text-sm">{row.missingHours} horas</span></div> },
      { label: "Presença", render: (row) => <span className={`inline-flex rounded-full px-3 py-1 text-sm font-bold ${presenceClass(row.presencePercentage)}`}>{row.presencePercentage}%<span className="sr-only">, {presenceLabel(row.presencePercentage)}</span></span> },
    ]} />;
  }

  const rows = lists.interventionPlans.filter((row) => interventionPlanMatches(row, filters));
  return <TableWithMeta id="behavior_intervention_plan_management" rows={rows} rowId={(row) => row.id} cols={[
    { label: "Paciente", render: (row) => <PatientCell patient={row.patient} /> },
    { label: "Vigência", render: (row) => <div><strong className="block">{formatIsoDate(row.startAt)}</strong><span className="text-sm">{formatIsoDate(row.endAt)}</span></div> },
    { label: "Criado por", render: (row) => <PersonCell person={row.createdBy} compact /> },
    { label: "Assinado por", render: (row) => row.signedBy ? <PersonName name={row.signedBy.name} subtitle={row.signedBy.phone} initials={row.signedBy.initials} /> : <span>—</span> },
    { label: "Status", render: (row) => <Tag item={planStatusLabel(row.status)} variant={planStatusVariant(row.status)} /> },
  ]} />;
}

function ManagementModal({
  state,
  lists,
  onClose,
  onSave,
}: {
  state: ModalState;
  lists: ManagementLists;
  onClose: () => void;
  onSave: (message: string) => void;
}) {
  const [signature, setSignature] = useState(true);
  if (!state) return null;

  if (state.kind === "report") {
    return (
      <Modal id="request-report-modal" open title="Solicitar relatório" onClose={onClose}>
        <div className="grid gap-4 md:grid-cols-2">
          <SelectField label="Paciente" value="" onChange={() => undefined} options={["Selecionar paciente", ...patientNames(lists)]} />
          <SelectField label="Profissional" value="" onChange={() => undefined} options={["Selecione o profissional", ...professionalNames(lists)]} />
          <SelectField label="Tipo" value="" onChange={() => undefined} options={["Selecionar", "Evolução mensal", "Alta hospitalar"]} />
          <SelectField label="Solicitante" value="" onChange={() => undefined} options={["Selecionar", "Operadora", "Família"]} />
          <Input id="report-due-date" type="date" label="Prazo" />
        </div>
        <ModalActions onClose={onClose} onSave={() => onSave("Relatório solicitado.")} />
      </Modal>
    );
  }

  if (state.kind === "supervisor") {
    return (
      <Modal id="supervisor-internships-modal" open title="Editar Aplicadores" onClose={onClose}>
        <PersonSummary person={state.row.professional} />
        <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
          <p className="m-0 font-bold text-[var(--color-brand-purple-dark)]">Aplicadores adicionados: {state.row.applicatorCount}</p>
          <Button type="button" variant="tint">Adicionar Aplicador</Button>
        </div>
        <div className="mt-4 space-y-3">
          {lists.applicators.filter((row) => row.supervisor.id === state.row.professional.id).map((row) => (
            <div key={row.id} className="grid items-end gap-3 rounded-lg bg-[var(--color-brand-purple-dark)]/5 p-3 md:grid-cols-[1fr_auto_auto]">
              <SelectField label="Aplicador" value={row.professional.name} onChange={() => undefined} options={professionalNames(lists)} />
              <Switch label="Assina" checked={row.needsSupervisorSignature} onChange={() => undefined} />
              <IconAction label={`Remover ${row.professional.name}`} icon="fa-trash" danger onClick={() => undefined} />
            </div>
          ))}
        </div>
        <ModalActions onClose={onClose} onSave={() => onSave("Aplicadores atualizados.")} />
      </Modal>
    );
  }

  if (state.kind === "applicator") {
    return (
      <Modal id="edit-supervisorship-modal" open title="Editar Supervisor" onClose={onClose}>
        <PersonSummary person={state.row.professional} trailing={<Switch label="Assina" checked={signature} onChange={setSignature} />} />
        <div className="mt-4"><SelectField label="Supervisor" value={state.row.supervisor.name} onChange={() => undefined} options={lists.supervisors.map((row) => row.professional.name)} /></div>
        <ModalActions onClose={onClose} onSave={() => onSave("Supervisor atualizado.")} />
      </Modal>
    );
  }

  return (
    <Modal id="edit-clinical-owner-modal" open title="Editar Responsáveis Clínicos" onClose={onClose}>
      <PatientSummary patient={state.row.patient} />
      <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
        <p className="m-0 font-bold text-[var(--color-brand-purple-dark)]">Responsáveis adicionados: {state.row.responsible ? 1 : 0}</p>
        <Button type="button" variant="tint">Adicionar Responsável</Button>
      </div>
      <div className="mt-4"><SelectField label="Profissional" value={state.row.responsible?.name ?? ""} onChange={() => undefined} options={["Selecione o profissional", ...professionalNames(lists)]} /></div>
      <ModalActions onClose={onClose} onSave={() => onSave("Responsáveis atualizados.")} />
    </Modal>
  );
}

function ModalActions({ onClose, onSave }: { onClose: () => void; onSave: () => void }) {
  return (
    <div className="mt-7 flex justify-between gap-4">
      <Button type="button" variant="outline" color="red" rightIcon="fa-times" onClick={onClose}>Cancelar</Button>
      <Button type="button" className="espelho-do-sistema" rightIcon="fa-save" onClick={onSave}>Salvar</Button>
    </div>
  );
}

function FilterGrid({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`grid gap-5 md:grid-cols-2 lg:grid-cols-3 ${className}`}>{children}</div>;
}

function SelectField({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
}) {
  const [prompt, ...availableOptions] = options;
  return (
    <Select
      label={label}
      prompt={prompt?.split("|")[0] ?? "Selecione uma opção"}
      value={value}
      onChange={onChange}
      options={availableOptions.map((option) => {
        const [optionLabel, explicitValue] = option.split("|");
        return { label: optionLabel ?? option, value: explicitValue ?? optionLabel ?? option };
      })}
    />
  );
}

function TableWithMeta<T>({
  rows,
  ...props
}: {
  id: string;
  rows: T[];
  rowId: (row: T) => string;
  cols: { label: string; className?: string; render: (row: T) => ReactNode }[];
}) {
  return (
    <div>
      <Table {...props} rows={rows} />
      <p className="m-0 mt-4 text-sm text-[var(--color-brand-purple-dark)]/60">Mostrando {rows.length} de {rows.length} registros</p>
    </div>
  );
}

function PersonCell({ person, compact = false }: { person: ManagementPerson; compact?: boolean }) {
  return <PersonName name={person.name} subtitle={person.specialty} initials={person.initials} compact={compact} />;
}

function PatientCell({ patient }: { patient: ManagementPatient }) {
  return <PersonName name={patient.name} initials={patient.initials} />;
}

function PersonName({ name, subtitle, initials, compact = false }: { name: string; subtitle?: string; initials?: string; compact?: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <span aria-hidden="true" className={`${compact ? "h-7 w-7 text-[0.625rem]" : "h-8 w-8 text-xs"} flex shrink-0 items-center justify-center rounded-full bg-[var(--color-brand-blue)] text-center font-black text-white`}>{initials ?? initialsFor(name)}</span>
      <span>
        <strong className="block text-[var(--color-brand-purple-dark)]/80">{name}</strong>
        {subtitle && <span className="block text-sm">{subtitle}</span>}
      </span>
    </div>
  );
}

function PersonSummary({ person, trailing }: { person: ManagementPerson; trailing?: ReactNode }) {
  return <div className="flex items-center justify-between gap-4 rounded-xl border border-[var(--color-brand-blue)] bg-[var(--color-brand-blue)]/10 p-3"><PersonCell person={person} />{trailing}</div>;
}

function PatientSummary({ patient }: { patient: ManagementPatient }) {
  return <div className="rounded-xl border border-[var(--color-brand-blue)] bg-[var(--color-brand-blue)]/10 p-3"><PatientCell patient={patient} /></div>;
}

function StatusDot({ active }: { active: boolean }) {
  return <span className={`inline-block h-2.5 w-2.5 rounded-full ${active ? "bg-[var(--color-green)]" : "bg-[var(--color-red)]"}`}><span className="sr-only">{active ? "Ativo" : "Inativo"}</span></span>;
}

function IconAction({ label, icon, onClick, danger = false }: { label: string; icon: string; onClick: () => void; danger?: boolean }) {
  return <button type="button" aria-label={label} title={label} onClick={onClick} className={`flex h-9 w-9 items-center justify-center rounded-lg ${danger ? "bg-[var(--color-red-light)] text-[var(--color-red)]" : "text-[var(--color-brand-blue)] hover:bg-[var(--color-brand-blue)]/10"}`}><Icon name={icon} /></button>;
}

function personMatches(person: ManagementPerson, filters: FilterState): boolean {
  return textMatches(person.name, filters.query) && (!filters.specialty || person.specialty === filters.specialty) && statusMatches(person.active ? "active" : "inactive", filters.status);
}

function patientMatches(patient: ManagementPatient, filters: FilterState): boolean {
  return textMatches(patient.name, filters.query) && statusMatches(patient.active ? "active" : "inactive", filters.status);
}

function registrationMatches(row: ManagementRegistrationRow, filters: FilterState): boolean {
  return textMatches(row.person.name, filters.query) && (!filters.specialty || row.specialty === filters.specialty) && (!filters.missing || row.missing.includes(filters.missing)) && statusMatches(row.person.active ? "active" : "inactive", filters.status);
}

function interventionPlanMatches(row: ManagementInterventionPlanRow, filters: FilterState): boolean {
  return (!filters.patient || row.patient.name === filters.patient) && (!filters.professional || row.createdBy.name === filters.professional) && (!filters.status || row.status === filters.status);
}

function managementReports(lists: ManagementLists, filters: FilterState): ReportControl[] {
  return lists.reportControls.filter((row) => (!filters.patient || row.patientName === filters.patient) && (!filters.professional || row.professionalName === filters.professional) && (!filters.status || row.status === filters.status) && (!filters.dueDate || row.dueDate === filters.dueDate));
}

function listsFromLegacyFixture(data: ManagementData): ManagementLists {
  return {
    ...EMPTY_LISTS,
    supervisors: data.mentorshipGaps.filter((gap) => gap.kind === "supervisor_without_applicators").map((gap) => ({ professional: { id: gap.professionalId, name: gap.professionalName, specialty: gap.specialty, active: true, initials: initialsFor(gap.professionalName) }, applicatorCount: 0 })),
    clinicalOwners: data.patientsWithoutOwner.map((patient) => ({ patient: { id: patient.id, name: patient.name, active: true, initials: initialsFor(patient.name) } })),
    professionalRegistration: data.incompleteProfessionals.map((person) => ({ person: { id: person.id, name: person.name, specialty: person.specialty, active: true, initials: initialsFor(person.name) }, specialty: person.specialty, missing: person.missing })),
    reportControls: data.reports,
  } as ManagementLists;
}

function patientNames(lists: ManagementLists): string[] {
  return Array.from(new Set([
    ...lists.clinicalOwners.map((row) => row.patient.name),
    ...lists.authorizations.map((row) => row.patient.name),
    ...lists.hourMaps.map((row) => row.patient.name),
    ...lists.interventionPlans.map((row) => row.patient.name),
    ...lists.reportControls.map((row) => row.patientName),
  ])).sort();
}

function professionalNames(lists: ManagementLists): string[] {
  return Array.from(new Set([
    ...lists.supervisors.map((row) => row.professional.name),
    ...lists.applicators.flatMap((row) => [row.professional.name, row.supervisor.name]),
    ...lists.clinicalOwners.flatMap((row) => row.responsible ? [row.responsible.name] : []),
  ])).sort();
}

function textMatches(value: string, query: string): boolean {
  return !query || value.toLocaleLowerCase("pt-BR").includes(query.toLocaleLowerCase("pt-BR"));
}

function statusMatches(value: string, filter: string): boolean {
  return !filter || value === filter;
}

function initialsFor(name: string): string {
  return name.split(" ").slice(0, 2).map((part) => part[0]).join("");
}

function formatIsoDate(value: string): string {
  const [year, month, day] = value.slice(0, 10).split("-");
  return year && month && day ? `${day}/${month}/${year}` : value;
}

function normalizeHourMapStatus(status: string | undefined): string {
  return ({ "Em vigência": "active", Aguardando: "waiting", Encerrado: "finished", Pendente: "pending", Cancelado: "cancelled" } as Record<string, string>)[status ?? ""] ?? "";
}

function hourMapVariant(status: string): "green" | "brand" | "red" | "orange" {
  if (status === "Em vigência") return "green";
  if (status === "Aguardando") return "brand";
  if (status === "Pendente") return "orange";
  return "red";
}

function reportStatusLabel(status: ReportControl["status"]): string {
  return { not_started: "Não iniciado", in_progress: "Em andamento", completed: "Concluído", cancelled: "Cancelado" }[status];
}

function reportStatusVariant(status: ReportControl["status"]): "orange" | "light-blue" | "green" | "red" {
  return { not_started: "orange", in_progress: "light-blue", completed: "green", cancelled: "red" }[status] as "orange" | "light-blue" | "green" | "red";
}

function planStatusLabel(status: ManagementInterventionPlanRow["status"]): string {
  return { active: "Vigente", pending: "Pendente", expired: "Expirado" }[status];
}

function planStatusVariant(status: ManagementInterventionPlanRow["status"]): "green" | "orange" | "brand" {
  return { active: "green", pending: "orange", expired: "brand" }[status] as "green" | "orange" | "brand";
}

function presenceClass(value: number): string {
  if (value >= 90) return "bg-[var(--color-green)] text-white";
  if (value >= 70) return "bg-[var(--color-yellow)] text-black";
  return "bg-[var(--color-red)] text-white";
}

function presenceLabel(value: number): string {
  if (value >= 90) return "presença acima de 90%";
  if (value >= 70) return "presença entre 70% e 89%";
  return "presença abaixo de 70%";
}

function wrap(context: ScreenProps["context"], children: ReactNode, management?: ManagementData) {
  return (
    <AppShell
      context={context}
      title="Gerência"
      subtitle={management ? `Unidade ${management.unit.name}` : undefined}
      breadcrumb={[{ label: "Listas gerenciais" }]}
      showPageHeading={false}
    >
      {children}
    </AppShell>
  );
}
