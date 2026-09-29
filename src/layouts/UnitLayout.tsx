import type { ReactNode } from "react";
import { Avatar } from "../components/Layout.js";
import { Button } from "../components/Button.js";
import { LinkButton } from "../components/Action.js";
import { Icon } from "../components/Icon.js";
import { Tag } from "../components/Tag.js";
import { DropdownMenu } from "../components/Overlay.js";
import { CardTabs, type CardTabSlot } from "../components/Tabs.js";
import { permissionsByRole } from "../personas/permissions.js";
import type { LayoutContext } from "./BackofficeLayout.js";

/**
 * `backoffice/live/unit_live/edit.ex` (as `card_tabs/1` da unidade) com
 * `UnitLive.Components.CardHeader` no slot `header`. Inativar e reativar ficam
 * no menu, sem efeito.
 */

export type UnitTabId = "data" | "address" | "patients" | "rooms" | "services" | "schedule" | "schedule_limit" | "documents";

export type UnitHeader = {
  name: string;
  avatarUrl?: string;
  active: boolean;
  /** `Units.count_unit_professionals/1`. */
  professionalsCount: number;
  /** `Units.count_unit_rooms/1`. */
  roomsCount: number;
  phone?: string;
  address: { street: string; number: string; neighborhood: string; city: string; state: string };
};

const plural = (count: number, one: string, many: string) => (count === 1 ? one : many);

/** `CardHeader.render/1`. */
export function UnitCardHeader({ unit, canEdit }: { unit: UnitHeader; canEdit: boolean }) {
  const a = unit.address;
  const menu: ReactNode[] = [
    <LinkButton type="link" navigate="/backoffice/unidades" leftIcon="fa-arrow-left" variant="ghost">
      Voltar para lista
    </LinkButton>,
  ];
  if (canEdit)
    menu.push(
      <Button type="button" className="text-red" variant="ghost" leftIcon="fa-power-off">
        {unit.active ? "Inativar" : "Reativar"}
      </Button>,
    );

  return (
    <div>
      <div className="flex flex-col items-center gap-4 md:flex-row md:justify-between">
        <div className="flex items-center gap-4">
          <Avatar imageUrl={unit.avatarUrl} size="extra_large" />
          <div className="space-y-2">
            <h1 className="text-brand-purple-dark font-bold text-2xl">{unit.name}</h1>
            <div className="flex gap-1.5 mt-2">
              <Tag
                item={unit.active ? "Ativo" : "Inativo"}
                variant={unit.active ? "green" : "red"}
                className="rounded-full"
                icon={unit.active ? "fa-solid fa-circle-check" : "fa-solid fa-circle-x"}
              />
            </div>
            <div className="flex gap-5 mt-3 flex-wrap">
              <p>
                <Icon name="fa-user-md" /> {unit.professionalsCount} {plural(unit.professionalsCount, "profissional", "profissionais")}
              </p>
              <p>
                <Icon name="fa-door-open" /> {unit.roomsCount} {plural(unit.roomsCount, "sala", "salas")}
              </p>
              <p>
                <Icon name="fa-phone" /> {unit.phone}
              </p>
              <p>
                <Icon name="fa-location-dot" /> {`${a.street}, ${a.number} - ${a.neighborhood}, ${a.city} - ${a.state}`}
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-row gap-4">
          <div className="shrink-0">
            <DropdownMenu id="unit_header_dropdown" items={menu} />
          </div>
        </div>
      </div>
    </div>
  );
}

const TABS: { id: UnitTabId; title: string }[] = [
  { id: "data", title: "Dados da Unidade" },
  { id: "address", title: "Endereço" },
  { id: "patients", title: "Pacientes" },
  { id: "rooms", title: "Salas" },
  { id: "services", title: "Serviços" },
  { id: "schedule", title: "Agenda" },
  { id: "schedule_limit", title: "Limite de Agenda" },
  { id: "documents", title: "Documentos" },
];

export function UnitLayout({
  context,
  unit,
  activeTab = "data",
  renderTab,
}: {
  context?: Pick<LayoutContext, "can">;
  unit: UnitHeader;
  activeTab?: UnitTabId;
  /** O conteúdo de cada aba (o `live_component` de cada uma no original). */
  renderTab?: (tab: UnitTabId) => ReactNode;
}) {
  const can = context ? context.can : (permission: string) => (permissionsByRole.admin as readonly string[]).includes(permission);
  const tabs: CardTabSlot[] = TABS.map((t) => ({ title: t.title, content: renderTab?.(t.id) ?? null }));

  return (
    <CardTabs
      id="unit_data"
      tab={tabs}
      initialTab={Math.max(0, TABS.findIndex((t) => t.id === activeTab))}
      header={<UnitCardHeader unit={unit} canEdit={can("units.edit")} />}
    />
  );
}
