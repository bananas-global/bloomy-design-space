import { useState, type ReactNode } from "react";
import { Avatar } from "../components/Layout.js";
import { Button } from "../components/Button.js";
import { LinkButton } from "../components/Action.js";
import { Icon } from "../components/Icon.js";
import { Tag } from "../components/Tag.js";
import { DropdownMenu, Modal } from "../components/Overlay.js";
import { LazyTabs, type LazyTab, type LazyTabEntry } from "../components/Tabs.js";
import { permissionsByRole } from "../personas/permissions.js";
import type { LayoutContext } from "./BackofficeLayout.js";

/**
 * `backoffice/live/patient_live/show.ex` (as `lazy_tabs/1` do paciente) com
 * `PatientLive.Components.CardHeader` no slot `header`. Adaptação: `md:`/`lg:`
 * viram `md:`/`lg:`. Os modais de observação, chat e inativação não foram
 * portados: os botões ficam, sem efeito. O drawer de acompanhamento periódico
 * fica com a tela que o usa (`onPeriodicMonitoring`).
 */

export type PatientTabId =
  | "personal_info" | "legal_guardian_info" | "school_info" | "plans" | "reports" | "patient_professionals"
  | "units" | "documents" | "summary" | "legal_contracts"
  | "clinical_summary" | "anamnese_general" | "anamnese_clinical" | "anamnese_external"
  | "treatment_plan" | "protocols"
  | "agenda_pattern" | "patient_availability"
  | "patient_appointments" | "program_executions" | "protocol_executions"
  | "patient_evolution"
  | "contracts" | "authorizations" | "patient_authorizations" | "invoices"
  | "patient_contents" | "patient_feed"
  | "no_show" | "nps";

export type PatientHeader = {
  name: string;
  avatarUrl?: string;
  /** `patient_status_label/1`: "Ativo", "Inativo" ou "Inativação em 10/09/2026". */
  status: string;
  /** `clinical_summary.clinical_summary_asd_profile.support_level`. */
  supportLevel?: number | string;
  restrictions?: boolean;
  isInjunction?: boolean;
  /** Idade em anos, já calculada. */
  age: number;
  /** Nome da primeira unidade do paciente. */
  unitName?: string;
  missedCancelledCount: number;
  activeWeeklyHours?: number;
  /** Com observação, o botão "Observações" ganha o `notification_badge`. */
  observation?: string;
};

function PatientStatusFields({ canEdit, patient, canChat }: { canEdit: boolean; patient: PatientHeader; canChat: boolean }) {
  return (
    <div className="flex flex-col md:flex-row items-center gap-x-2 gap-y-4">
      <Button type="button" className="w-full md:w-fit" disabled={!canEdit} rightIcon="fa-notes-medical" variant="tint" color="blue" notificationBadge={patient.observation != null}>
        Observações
      </Button>

      {canChat && (
        <Button className="hidden md:block" type="button" variant="tint" color="purple" title="Chat Multidisciplinar">
          <Icon className="self-center" name="fa-messages" />
        </Button>
      )}

      {canChat && (
        <Button className="w-full block md:hidden" type="button" rightIcon="fa-messages" variant="tint" color="purple" title="Chat Multidisciplinar">
          Chat
        </Button>
      )}
    </div>
  );
}

/** `CardHeader.render/1`. */
export function PatientCardHeader({
  patient,
  canEdit,
  canChat,
  onPeriodicMonitoring,
  extraTags,
}: {
  patient: PatientHeader;
  canEdit: boolean;
  canChat: boolean;
  /** `show_drawer("periodic_monitoring_drawer")`. */
  onPeriodicMonitoring?: () => void;
  /** Novo, ainda não está no Phoenix: tags que a tela acrescenta depois das do paciente. */
  extraTags?: ReactNode;
}) {
  const [options, setOptions] = useState(false);
  const active = patient.status === "Ativo";

  const menu: ReactNode[] = [
    <LinkButton type="link" navigate="/backoffice/pacientes" leftIcon="fa-arrow-left" variant="ghost">
      Voltar para lista
    </LinkButton>,
  ];
  if (canEdit)
    menu.push(
      <Button type="button" variant="ghost" leftIcon="fa-scale-balanced">
        Liminar
      </Button>,
      <Button type="button" variant="ghost" leftIcon="fa-triangle-exclamation">
        Restrições
      </Button>,
    );
  menu.push(
    <Button type="button" variant="ghost" leftIcon="fa-list-check" title="Acompanhamento periódico" onClick={onPeriodicMonitoring}>
      Acompanhamento
    </Button>,
  );
  if (canEdit)
    menu.push(
      <Button type="button" className="text-red" variant="ghost" leftIcon="fa-power-off">
        {active ? "Inativar" : "Reativar"}
      </Button>,
    );

  return (
    <div>
      <div className="flex flex-col items-center gap-4 md:flex-row md:justify-between">
        <div className="flex items-center gap-4">
          <Avatar imageUrl={patient.avatarUrl} size="extra_large" />
          <div className="space-y-2">
            <h1 className="text-brand-purple-dark font-bold text-2xl">{patient.name}</h1>
            <div className="flex gap-1.5 mt-2">
              <Tag item={patient.status} variant={active ? "green" : "red"} className="rounded-full" icon={active ? "fa-solid fa-circle-check" : "fa-solid fa-circle-x"} />
              <Tag item={`TEA Nível ${patient.supportLevel ?? "-"}`} className="rounded-full" icon="fa-solid fa-brain" />
              {patient.restrictions && <Tag item="Restrições" className="rounded-full" variant="light-purple" icon="fa-solid fa-triangle-exclamation" />}
              {patient.isInjunction && <Tag item="Liminar" className="rounded-full" variant="orange" icon="fa-solid fa-scale-balanced" />}
              {extraTags}
            </div>
            <div className="flex gap-5 mt-3 flex-wrap">
              <p>
                <Icon name="fa-cake-candles" /> {patient.age} anos
              </p>
              <p>
                <Icon name="fa-building" /> {patient.unitName ?? "-"}
              </p>
              <p>
                <Icon name="fa-calendar-xmark" className="mr-1" />
                {patient.missedCancelledCount} faltas
              </p>
              <p>
                <Icon name="fa-clock" className="mr-1" />
                {patient.activeWeeklyHours ?? 0}h semanais
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-row gap-4">
          <div className="flex items-center gap-4 w-full md:w-fit">
            <div className="hidden lg:block">
              <PatientStatusFields canEdit={canEdit} patient={patient} canChat={canChat} />
            </div>

            <Button className="block w-full md:w-fit lg:hidden" color="purple" variant="tint" type="button" onClick={() => setOptions(true)}>
              Ver Mais
            </Button>
          </div>

          <div className="shrink-0">
            <DropdownMenu id="patient_header_dropdown" items={menu} />
          </div>
        </div>
      </div>

      <Modal id="card_header_options" show={options} onCancel={() => setOptions(false)} title="Ver mais" variant="medium">
        <PatientStatusFields canEdit={canEdit} patient={patient} canChat={canChat} />
      </Modal>
    </div>
  );
}

export function PatientLayout({
  context,
  patient,
  activeTab = "personal_info",
  renderTab,
  onPeriodicMonitoring,
  extraTags,
}: {
  context?: Pick<LayoutContext, "can">;
  patient: PatientHeader;
  /** `@initial_tab`: `:treatment_plan` quando a URL traz `objective_id`. */
  activeTab?: PatientTabId;
  /** O conteúdo de cada aba (o `component` de cada uma no original). */
  renderTab?: (tab: PatientTabId) => ReactNode;
  /** O item Acompanhamento do menu do card. */
  onPeriodicMonitoring?: () => void;
  /** Novo, ainda não está no Phoenix: tags que a tela acrescenta no card. */
  extraTags?: ReactNode;
}) {
  const can = context ? context.can : (permission: string) => (permissionsByRole.admin as readonly string[]).includes(permission);
  const tab = (id: PatientTabId, title: string, opts?: LazyTab["opts"]): LazyTab => ({ id, title, opts, component: () => renderTab?.(id) ?? null });
  const services = can("patients.see_services");
  const financial = can("patients.see_financial");

  const tabs: (LazyTabEntry | false)[] = [
    {
      title: "Dados Pessoais",
      tabs: [
        tab("personal_info", "Dados Pessoais"),
        tab("legal_guardian_info", "Dados dos Responsáveis"),
        tab("school_info", "Dados da Escola"),
        tab("plans", "Plano de Sáude"),
        tab("reports", "Relatórios"),
        tab("patient_professionals", "Responsáveis Clínicos"),
        tab("units", "Unidades"),
        tab("documents", "Documentos"),
        tab("summary", "Resumo"),
        tab("legal_contracts", "Contratos"),
      ],
    },
    {
      title: "Anamneses",
      tabs: [
        tab("clinical_summary", "Resumo Clínico"),
        tab("anamnese_general", "Anamnese Geral"),
        tab("anamnese_clinical", "Anamnese Clínica"),
        tab("anamnese_external", "Externo"),
      ],
    },
    {
      title: "PIC",
      tabs: [tab("treatment_plan", "Plano de Intervenção Comportamental", { card: false }), tab("protocols", "Protocolos")],
    },
    {
      title: "Mapa de Horas",
      tabs: [tab("agenda_pattern", "Padrão de Agenda"), tab("patient_availability", "Disponibilidade do Paciente")],
    },
    {
      title: "Atendimentos",
      tabs: [
        tab("patient_appointments", "Geral"),
        services && tab("program_executions", "Execuções de Programa"),
        services && tab("protocol_executions", "Performance de Protocolos"),
      ],
    },
    tab("patient_evolution", "Evolução"),
    {
      title: "Financeiro",
      tabs: [
        financial && tab("contracts", "Contratos", { card: false }),
        financial && tab("authorizations", "Autorizações"),
        financial && tab("patient_authorizations", "Padrão de Autorizações"),
        financial && tab("invoices", "Faturamento"),
      ],
    },
    {
      title: "Conteúdos",
      tabs: [tab("patient_contents", "Conteúdos"), tab("patient_feed", "Feed")],
    },
    can("alert_criteria.edit") && tab("no_show", "Faltas"),
    can("patients.list_nps") && tab("nps", "NPS"),
  ];

  return (
    <div>
      <LazyTabs
        id="patient_tabs"
        tabs={tabs}
        activeTab={activeTab}
        header={
          <PatientCardHeader
            patient={patient}
            canEdit={can("patients.edit")}
            canChat={can("chat.show")}
            onPeriodicMonitoring={onPeriodicMonitoring}
            extraTags={extraTags}
          />
        }
      />
    </div>
  );
}
