import type { ReactNode } from "react";
import { Avatar } from "../components/Layout.js";
import { Button } from "../components/Button.js";
import { LinkButton } from "../components/Action.js";
import { Icon } from "../components/Icon.js";
import { Tag } from "../components/Tag.js";
import { DropdownMenu } from "../components/Overlay.js";
import { LazyTabs, type LazyTab, type LazyTabEntry } from "../components/Tabs.js";
import { permissionsByRole } from "../personas/permissions.js";
import type { LayoutContext } from "./BackofficeLayout.js";

/**
 * `backoffice/live/professionals/show.ex` (as `lazy_tabs/1` do profissional)
 * com `ProfessionalLive.Components.CardHeader` no slot `header`. O drawer de
 * inativação (`ProfessionalStatusDrawer`) não foi portado: os itens do menu
 * ficam, sem efeito.
 */

export type ProfessionalTabId =
  | "personal_info" | "professional_data" | "address" | "company_info"
  | "units" | "standard_agenda" | "services" | "schedule_blockings" | "hired_professionals" | "appointments"
  | "patients" | "supervisorship"
  | "documents" | "hours_control" | "presence_control";

export type ProfessionalHeader = {
  name: string;
  avatarUrl?: string;
  /** `professional_status_label/1`: "Ativo", "Inativo" ou "Inativação em 10/09/2026". */
  status: string;
  /** `@professional.specialty.name`. */
  specialty: string;
  /** `professional_health_formation/1`: "CRP", "CREFITO", "Registro"… */
  healthFormation: string;
  specialtyRegister?: string;
  supervisorName?: string;
  /** `false` mostra a tag vermelha "Dashboard". */
  showInDashboard: boolean;
  tbd: boolean;
  phone?: string;
  email?: string;
  /** Início do contrato mais recente, já em `dd/mm/aaaa`. */
  contractStart?: string;
  uniquePatientsCount: number;
  weeklyScheduleHours: number;
  /** Já formatado, como vem de `Metrics.get_metrics/1`: "10.0". */
  occupancyRate: string;
  absenceCount: number;
};

const plural = (count: number, one: string, many: string) => (count === 1 ? one : many);

/** `CardHeader.render/1`. */
export function ProfessionalCardHeader({ professional, canEdit }: { professional: ProfessionalHeader; canEdit: boolean }) {
  const active = professional.status !== "Inativo";
  const deactivating = professional.status.startsWith("Inativação");

  const menu: ReactNode[] = [
    <LinkButton type="link" navigate="/backoffice/profissionais" leftIcon="fa-arrow-left" variant="ghost">
      Voltar para lista
    </LinkButton>,
  ];
  if (canEdit) {
    menu.push(
      <Button type="button" variant="ghost" leftIcon="fa-chart-line">
        Mostrar no dashboard
      </Button>,
      <Button type="button" variant="ghost" leftIcon="fa-user">
        TBD
      </Button>,
    );
    if (active && !deactivating)
      menu.push(
        <Button type="button" className="text-red" variant="ghost" leftIcon="fa-power-off">
          Inativar
        </Button>,
      );
    else
      menu.push(
        <Button type="button" variant="ghost" leftIcon="fa-rotate-left">
          Reativar
        </Button>,
      );
  }

  return (
    <div>
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex min-w-0 flex-col items-start gap-4 sm:flex-row sm:items-center">
          <Avatar imageUrl={professional.avatarUrl} size="custom" className="w-22 h-22" />

          <div className="min-w-0">
            <h1 className="break-words font-bold text-2xl/6">{professional.name}</h1>
            <div className="mt-2 flex min-w-0 flex-wrap gap-1.5 [&>span]:max-w-full [&>span]:break-words">
              <Tag
                item={professional.status}
                variant={active ? "green" : "red"}
                className="rounded-full"
                icon={active ? "fa-solid fa-circle-check" : "fa-solid fa-circle-x"}
              />
              <Tag item={professional.specialty} className="rounded-full" icon="fa-solid fa-stethoscope" />
              <Tag
                variant="light-purple"
                item={`${professional.healthFormation} ${professional.specialtyRegister || "-"}`}
                className="rounded-full"
                icon="fa-solid fa-file-pen"
              />
              {professional.supervisorName && (
                <Tag item={`Supervisor: ${professional.supervisorName}`} variant="dark-blue" className="rounded-full" icon="fa-solid fa-user-md" />
              )}
              {!professional.showInDashboard && <Tag item="Dashboard" variant="red" className="rounded-full" icon="fa-solid fa-circle-x" />}
              {professional.tbd && <Tag item="TBD" variant="yellow" className="rounded-full" icon="fa-solid fa-circle-exclamation" />}
            </div>
            <div className="mt-3 flex min-w-0 flex-wrap gap-5 [&>p]:max-w-full [&>p]:break-words">
              <p>
                <Icon name="fa-phone" /> {professional.phone || "-"}
              </p>
              <p>
                <Icon name="fa-envelope" /> {professional.email || "-"}
              </p>
              <p>
                <Icon name="fa-calendar-circle-user" className="mr-1" />
                {professional.contractStart ?? "-"}
              </p>
              <p>
                <Icon name="fa-users" /> {professional.uniquePatientsCount} {plural(professional.uniquePatientsCount, "paciente", "pacientes")}
              </p>
              <p>
                <Icon name="fa-clock" className="mr-1" />
                {`${professional.weeklyScheduleHours}h`} semanais
              </p>
              <p>
                <Icon name="fa-chart-pie" className="mr-1" />
                {`${professional.occupancyRate}%`} de ocupação
              </p>
              <p>
                <Icon name="fa-calendar-xmark" /> {professional.absenceCount} {plural(professional.absenceCount, "falta", "faltas")}
              </p>
            </div>
          </div>
        </div>

        <div className="shrink-0 self-end lg:self-auto">
          <DropdownMenu id="professional_header_dropdown" items={menu} />
        </div>
      </div>
    </div>
  );
}

export function ProfessionalLayout({
  context,
  professional,
  activeTab = "personal_info",
  renderTab,
}: {
  context?: Pick<LayoutContext, "can">;
  professional: ProfessionalHeader;
  activeTab?: ProfessionalTabId;
  /** O conteúdo de cada aba (o `component` de cada uma no original). */
  renderTab?: (tab: ProfessionalTabId) => ReactNode;
}) {
  const can = context ? context.can : (permission: string) => (permissionsByRole.admin as readonly string[]).includes(permission);
  const tab = (id: ProfessionalTabId, title: string): LazyTab => ({ id, title, component: () => renderTab?.(id) ?? null });
  const hired = can("professionals.edit_hired_professional");

  const tabs: (LazyTabEntry | false)[] = [
    {
      title: "Dados Pessoais",
      tabs: [
        tab("personal_info", "Dados Pessoais"),
        tab("professional_data", "Dados Profissionais"),
        tab("address", "Endereço"),
        tab("company_info", "Dados PJ"),
      ],
    },
    tab("units", "Unidades"),
    tab("standard_agenda", "Escala"),
    tab("services", "Serviços"),
    tab("schedule_blockings", "Bloqueios"),
    hired && tab("hired_professionals", "Contratação"),
    tab("appointments", "Atendimentos"),
    can("professional_patients.list") && {
      title: "Vínculo",
      tabs: [tab("patients", "Responsável Clínico"), tab("supervisorship", "Supervisão")],
    },
    tab("documents", "Documentos"),
    hired && tab("hours_control", "Controle de Horas"),
    hired && tab("presence_control", "Controle de Presença"),
  ];

  return (
    <div>
      <LazyTabs
        id="professional_tabs"
        tabs={tabs}
        activeTab={activeTab}
        header={<ProfessionalCardHeader professional={professional} canEdit={can("professionals.edit")} />}
      />
    </div>
  );
}
