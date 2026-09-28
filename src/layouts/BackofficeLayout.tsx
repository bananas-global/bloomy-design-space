import { useState, type ReactNode } from "react";
import type { ScenarioContext } from "@brucesantos/design-space";
import symbolNegative from "../assets/bloomy-symbol-negative.svg";
import { Icon } from "../components/Icon.js";
import { Avatar } from "../components/Layout.js";
import { Dropdown } from "../components/Overlay.js";
import {
  Breadcrumbs,
  Drawer,
  Timer,
  ToastWrapper,
  type BreadcrumbItem,
  type DrawerItem,
  type TimerCustomService,
} from "../components/BackofficeComponents.js";
import { NotificationComponent, type UserNotification } from "../components/Notification.js";
import { permissionsByRole } from "../personas/permissions.js";

/**
 * `layouts/backoffice.html.heex`, com `BackofficeComponents.drawer/1`,
 * `breadcrumbs/1`, `timer/1` e `toast_wrapper/1`.
 *
 * Adaptação: `md:`/`lg:` viram `@tablet:`/`@desktop:`. O menu é filtrado como o
 * `:if` de cada item: por policy (`context.can`) ou pela lista de papéis do
 * layout (`context.persona.id`). Sem `context`, é a visão do Admin.
 * `SignatureNotificationModal` não foi portado.
 */

export type LayoutContext = Pick<ScenarioContext, "navigate" | "can" | "persona">;

type MenuItem = DrawerItem & { visible: (role: string, can: (permission: string) => boolean) => boolean };

const inRoles = (roles: string) => (role: string) => roles.split(" ").includes(role);
const policy = (permission: string) => (_role: string, can: (permission: string) => boolean) => can(permission);

/** Os `<:item>` do layout, na ordem, com o `:if` de cada um. */
export const BACKOFFICE_MENU: MenuItem[] = [
  { to: "/backoffice", title: "Dashboard", icon: "fa-chart-pie", exact: true, visible: (role) => !inRoles("attendant therapeutic_companion operation people supervisor applicator specialist seller")(role) },
  { to: "/backoffice/agendamentos", title: "Agendamentos", icon: "fa-calendar-day", visible: policy("schedules.list") },
  { to: "/backoffice/mapa-da-unidade", title: "Mapa da Unidade", icon: "fa-table", visible: policy("unit_maps.show") },
  { to: "/backoffice/pacientes", title: "Pacientes", icon: "fa-users", visible: policy("patients.list") },
  { to: "/backoffice/visitas", title: "Leads", icon: "fa-user-plus", visible: inRoles("admin clinic_admin coordinator seller") },
  { to: "/backoffice/na-clinica", title: "Na Clínica", icon: "fa-house-chimney-medical", visible: inRoles("admin clinic_admin coordinator supervisor attendant people therapeutic_companion specialist") },
  { to: "/backoffice/programas", title: "Biblioteca", icon: "fa-memo-circle-check", visible: policy("programs.list") },
  { to: "/backoffice/profissionais", title: "Profissionais", icon: "fa-user-md", visible: policy("professionals.list") },
  { to: "/backoffice/unidades", title: "Unidades", icon: "fa-hospital", visible: policy("units.list") },
  { to: "/backoffice/central_autorizacoes", title: "Central de autorizações", icon: "fa-solid fa-bullhorn", visible: policy("authorizations.hub") },
  { to: "/backoffice/operadoras", title: "Operadoras", icon: "fa-building", visible: policy("health_cares.list") },
  { to: "/backoffice/servicos", title: "Serviços", icon: "fa-suitcase-medical", visible: policy("services.list") },
  // `BlockingPolicy.can?(role, :list)`: não está na matriz gerada.
  { to: "/backoffice/bloqueios", title: "Bloqueios", icon: "fa-calendar-xmark", visible: inRoles("admin clinic_admin") },
  { to: "/backoffice/atendimentos", title: "Atendimentos", icon: "fa-calendar-pen", visible: inRoles("coordinator therapeutic_companion supervisor applicator specialist") },
  { to: "/backoffice/financeiro/fechamentos", title: "Fechamentos", icon: "fa-dollar", visible: policy("closures.list") },
  { to: "/backoffice/gerencia", title: "Listas gerenciais", icon: "fa-gear", visible: inRoles("admin clinic_admin coordinator") },
  { to: "/backoffice/usuarios", title: "Colaboradores", icon: "fa-solid fa-user-tie", visible: policy("users.list") },
  // `LegalDocumentPolicy.can?(role, :list)`: não está na matriz gerada.
  { to: "/backoffice/termos-e-contratos", title: "Termos e contratos", icon: "fa-file-signature", visible: inRoles("admin") },
  { to: "/backoffice/supervisao", title: "Supervisão", icon: "fa-regular fa-people-group", visible: inRoles("coordinator supervisor") },
];

export type CurrentUser = {
  name: string;
  avatarUrl?: string;
  /** Nomes das unidades de `@current_user.units`. */
  units: string[];
  /** Rótulos (`translate_enum`) de `@current_user.roles`. */
  roles: string[];
  /** Tem cadastro de profissional: mostra "Meu perfil". */
  professional?: boolean;
};

const ITEM_LINK =
  "relative flex cursor-pointer select-none hover:bg-neutral-100/40 items-center rounded px-2 py-1.5 text-sm outline-none transition-colors focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50";
const ITEM_LINK_V4 =
  "relative flex  cursor-pointer select-none hover:bg-neutral-100/40 items-center rounded px-2 py-1.5 text-sm outline-none transition-colors focus:bg-accent focus:text-accent-foreground data-disabled:pointer-events-none data-disabled:opacity-50";

export function BackofficeLayout({
  context,
  currentPath = "/backoffice",
  breadcrumbs = [],
  hideMenu = false,
  currentUser = { name: "Marina Alves", units: ["Unidade Jardim"], roles: [] },
  currentUnit,
  currentAssistance,
  now,
  notifications,
  universityEnabled = false,
  flash,
  children,
}: {
  /** Numa tela de feature, o `context` que ela recebe do motor. */
  context?: LayoutContext;
  /** `@current_path`: decide o item ativo do menu. */
  currentPath?: string;
  /** `@page_breadcrumbs`. */
  breadcrumbs?: BreadcrumbItem[];
  /** `@hide_menu`. */
  hideMenu?: boolean;
  currentUser?: CurrentUser;
  /** `@current_unit.name`. Padrão: a primeira unidade da pessoa. */
  currentUnit?: string;
  /** `@current_assistance`: com ele o cabeçalho mostra o `timer/1`. */
  currentAssistance?: TimerCustomService;
  /** Relógio de referência do `timer/1` (ISO). */
  now?: string;
  notifications?: UserNotification[];
  /** `Bloomy.University.enabled?()`. */
  universityEnabled?: boolean;
  /** Onde o `flash_group/1` do layout fica. */
  flash?: ReactNode;
  children: ReactNode;
}) {
  const [collapsed, setCollapsed] = useState(true);
  const toggle = () => setCollapsed((value) => !value);
  const navigate = (to: string) => context?.navigate(to);

  const role = context?.persona?.id ?? "admin";
  const roleLabel = context?.persona?.name ?? "Admin";
  const can = context ? context.can : (permission: string) => (permissionsByRole.admin as readonly string[]).includes(permission);
  const items = BACKOFFICE_MENU.filter((item) => item.visible(role, can));
  const unitName = currentUnit ?? currentUser.units[0] ?? "";
  const roles = currentUser.roles.length ? currentUser.roles : [roleLabel];
  const link = (href: string) => ({
    href,
    onClick: (event: { preventDefault: () => void }) => event.preventDefault(),
  });

  return (
    <>
      {flash}
      <div className="relative h-full min-h-screen flex min-w-full bg-background">
        {!hideMenu && (
          <Drawer
            className="shrink-0 grow-0"
            currentPath={currentPath}
            item={items}
            collapsed={collapsed}
            onToggle={toggle}
            onNavigate={navigate}
          />
        )}

        <div
          id="main-content"
          data-sidebar-collapsed={collapsed ? "true" : "false"}
          className={[
            "group/main relative flex-1 h-full",
            "w-full @tablet:data-[sidebar-collapsed=false]:w-[calc(100%-16rem)] @tablet:data-[sidebar-collapsed=true]:w-[calc(100%-4rem)]",
          ].join(" ")}
        >
          {!hideMenu && (
            <header className="flex items-stretch">
              <button id="header-drawer-button-mobile" onClick={toggle} className="flex @desktop:hidden items-center justify-center bg-brand-blue min-w-20">
                <img src={symbolNegative} alt="Logo da Bloomy" className="w-12 h-12" />
              </button>

              <div className="top-0 sticky z-40 relative flex w-full items-center justify-end @tablet:justify-between bg-white px-4 @desktop:px-8 py-4 shadow-main">
                <div className="flex gap-4">
                  <div className="hidden @desktop:block">
                    <button id="header-drawer-button" onClick={toggle} className="h-5 w-5 flex items-center justify-center text-brand-purple-dark/60">
                      <Icon name="fa-sidebar" />
                    </button>
                  </div>

                  {breadcrumbs.length > 0 && <Breadcrumbs items={breadcrumbs} onNavigate={navigate} />}
                </div>

                {currentAssistance && now && (
                  <Timer customService={currentAssistance} now={now} className="mr-4 @tablet:mr-0" onNavigate={navigate} />
                )}

                <div className="flex items-center gap-x-4 @tablet:gap-x-6">
                  {currentUser.units.length > 0 && (
                    <Dropdown
                      id="unit_dropdown"
                      className={currentAssistance ? "hidden @desktop:block" : undefined}
                      items={
                        <div>
                          <div className="flex gap-2 items-center @tablet:hidden px-2 py-1 rounded-md bg-green/10 mb-2 w-full">
                            <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-green/20">
                              <Icon name="fa-hospital" className="text-green" />
                            </div>
                            <p className="text-sm">
                              <span className="block text-green text-base/4 font-black">Unidade</span>
                              {unitName}
                            </p>
                          </div>

                          {currentUser.units.map((unit) => (
                            <a key={unit} {...link("/backoffice/change_unit")} className={ITEM_LINK}>
                              <span>{unit}</span>
                            </a>
                          ))}
                        </div>
                      }
                    >
                      <div className="flex gap-2 items-center">
                        <p className="text-end text-sm hidden @tablet:block">
                          <span className="block text-green text-base/4 font-black">Unidade</span>
                          {unitName}
                        </p>
                        <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-green/20">
                          <Icon name="fa-hospital" className="text-green" />
                        </div>
                      </div>
                    </Dropdown>
                  )}

                  <Dropdown
                    id="profile_dropdown"
                    className={currentAssistance ? "hidden @desktop:block" : undefined}
                    items={
                      <div>
                        <div className="flex gap-2 items-center @tablet:hidden px-2 py-1 rounded-md bg-purple/10 mb-2 w-full">
                          <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-brand-purple/20">
                            <Icon name="fa-user-tie" className="text-purple" />
                          </div>

                          <p className="text-end text-sm">
                            <span className="block text-purple text-base/4 font-black">Perfil</span>
                            {roleLabel}
                          </p>
                        </div>

                        {roles.map((label) => (
                          <a key={label} {...link("/backoffice/change_role")} className={ITEM_LINK}>
                            <span>{label}</span>
                          </a>
                        ))}
                      </div>
                    }
                  >
                    <div className="flex gap-2 items-center">
                      <p className="text-end text-sm hidden @tablet:block">
                        <span className="block text-purple text-base/4 font-black">Perfil</span>
                        {roleLabel}
                      </p>

                      <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-brand-purple/20">
                        <Icon name="fa-user-tie" className="text-purple" />
                      </div>
                    </div>
                  </Dropdown>

                  <Dropdown
                    id="mobile_profile_dropdown"
                    className="max-h-10 @tablet:max-h-none"
                    items={
                      <div>
                        <div className="flex gap-2 items-center @tablet:hidden px-2 py-1 rounded-md bg-blue/10 mb-2 w-full">
                          <Avatar size="medium" shape="square" imageUrl={currentUser.avatarUrl} />

                          <p className="text-sm">
                            <span className="block text-brand-blue-dark text-base/4 font-black">{currentUser.name}</span>
                            Bem-vindo(a)
                          </p>
                        </div>

                        {(currentUser.professional || role === "admin") && (
                          <a {...link("/backoffice/perfil")} className={ITEM_LINK_V4}>
                            <Icon name="fa-user" className="mr-2 w-4" />
                            <span>Meu perfil</span>
                          </a>
                        )}

                        {universityEnabled && (
                          <a
                            {...link("/backoffice/university")}
                            className="relative flex cursor-pointer select-none hover:bg-neutral-100/40 items-center rounded px-2 py-1.5 text-sm outline-none transition-colors focus:bg-accent focus:text-accent-foreground"
                          >
                            <Icon name="fa-book-open" className="mr-2 w-4" />
                            <span>Universidade</span>
                          </a>
                        )}

                        <a {...link("/backoffice/kb-auth")} target="_blank" className={ITEM_LINK_V4}>
                          <Icon name="fa-book-open" className="mr-2 w-4" />
                          <span>Base de Conhecimento</span>
                        </a>

                        <a {...link("/backoffice/log_out")} className="relative flex cursor-pointer select-none hover:bg-neutral-100/40 items-center rounded px-2 py-1.5 text-sm outline-none transition-colors focus:bg-accent focus:text-accent-foreground data-disabled:pointer-events-none data-disabled:opacity-50">
                          <Icon name="fa-arrow-left-from-bracket" className="mr-2 w-4" />
                          <span>Sair</span>
                        </a>
                      </div>
                    }
                  >
                    <div className="flex gap-2 items-center">
                      <p className="text-end text-sm hidden @tablet:block">
                        <span className="block text-brand-blue-dark text-base/4 font-black">{currentUser.name}</span>
                        Bem-vindo(a)
                      </p>

                      <Avatar imageUrl={currentUser.avatarUrl} size="medium" shape="square" />
                    </div>
                  </Dropdown>

                  <NotificationComponent notifications={notifications} onNavigate={navigate} />
                </div>
              </div>
            </header>
          )}

          <main className="p-4 @desktop:p-8 h-full relative">{children}</main>
        </div>
      </div>

      <ToastWrapper />
    </>
  );
}
