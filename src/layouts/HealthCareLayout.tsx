import { useState, type ReactNode } from "react";
import symbolNegative from "../assets/bloomy-symbol-negative.svg";
import { Icon } from "../components/Icon.js";
import { Avatar } from "../components/Layout.js";
import { Dropdown } from "../components/Overlay.js";
import { Drawer, ToastWrapper, type DrawerItem } from "../components/BackofficeComponents.js";

/**
 * `layouts/health_care.html.heex`: o portal da operadora. Mesmo `drawer/1` do
 * backoffice com quatro itens fixos, sem breadcrumbs, timer nem notificações.
 * Adaptação: `md:`/`lg:` viram `@tablet:`/`@desktop:`.
 */

const HEALTH_CARE_MENU: DrawerItem[] = [
  { to: "/operadora/pacientes", title: "Pacientes", icon: "fa-users" },
  { to: "/operadora/atendimentos", title: "Atendimentos", icon: "fa-calendar-pen" },
  { to: "/operadora/agendamentos", title: "Agendamentos", icon: "fa-calendar-day" },
  { to: "/operadora/lista_presenca", title: "Lista de Presença", icon: "fa-square-list" },
];

const ITEM_LINK =
  "relative flex cursor-pointer select-none hover:bg-neutral-100/40 items-center rounded px-2 py-1.5 text-sm outline-none transition-colors focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50";

export type HealthCareUser = { name: string; avatarUrl?: string; units: string[] };

export function HealthCareLayout({
  currentPath = "/operadora/pacientes",
  currentHealthCareUser = { name: "Renata Duarte", units: ["Unidade Jardim"] },
  currentUnit,
  onNavigate,
  flash,
  children,
}: {
  currentPath?: string;
  currentHealthCareUser?: HealthCareUser;
  currentUnit?: string;
  onNavigate?: (to: string) => void;
  flash?: ReactNode;
  children: ReactNode;
}) {
  const [collapsed, setCollapsed] = useState(true);
  const toggle = () => setCollapsed((value) => !value);
  const unitName = currentUnit ?? currentHealthCareUser.units[0] ?? "";
  const prevent = { onClick: (event: { preventDefault: () => void }) => event.preventDefault() };

  return (
    <>
      {flash}
      <div className="relative h-full min-h-screen flex min-w-screen bg-background">
        <Drawer className="flex-shrink-0 flex-grow-0" currentPath={currentPath} item={HEALTH_CARE_MENU} collapsed={collapsed} onToggle={toggle} onNavigate={onNavigate} />

        <div
          id="main-content"
          data-sidebar-collapsed={collapsed ? "true" : "false"}
          className={[
            "relative flex-1 h-full",
            "w-full @tablet:data-[sidebar-collapsed=false]:w-[calc(100%-16rem)] @tablet:data-[sidebar-collapsed=true]:w-[calc(100%-72px)]",
          ].join(" ")}
        >
          <header className="flex items-stretch">
            <button id="header-drawer-button-mobile" onClick={toggle} className="flex @tablet:hidden items-center justify-center bg-brand-blue min-w-20">
              <img src={symbolNegative} alt="Logo da Bloomy" className="w-12 h-12" />
            </button>

            <div className="top-0 sticky z-40 flex w-full items-center justify-end @tablet:justify-between bg-white px-4 @desktop:px-8 py-4 shadow-main">
              <div className="hidden @tablet:block">
                <button id="header-drawer-button" onClick={toggle} className="h-5 w-5 flex items-center justify-center text-brand-purple-dark/60">
                  <Icon name="fa-sidebar" />
                </button>
              </div>

              <div className="flex items-center gap-x-4 @tablet:gap-x-6">
                {currentHealthCareUser.units.length > 0 && (
                  <Dropdown
                    id="unit_selector"
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

                        {currentHealthCareUser.units.map((unit) => (
                          <a key={unit} href="/backoffice/change_unit" {...prevent} className={ITEM_LINK}>
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
                  id="profile_mobile"
                  className="max-h-[40px] @tablet:max-h-none"
                  items={
                    <div>
                      <div className="flex gap-2 items-center @tablet:hidden px-2 py-1 rounded-md bg-blue/10 mb-2 w-full">
                        <Avatar size="medium" shape="square" imageUrl={currentHealthCareUser.avatarUrl} />

                        <p className="text-sm">
                          <span className="block text-brand-blue-dark text-base/4 font-black">{currentHealthCareUser.name}</span>
                          Bem-vindo(a)
                        </p>
                      </div>

                      <a href="/backoffice/log_out" {...prevent} className={ITEM_LINK}>
                        <Icon name="fa-arrow-left-from-bracket" className="mr-2" />
                        <span>Sair</span>
                      </a>
                    </div>
                  }
                >
                  <div className="flex gap-2 items-center">
                    <p className="text-end text-sm hidden @tablet:block">
                      <span className="block text-brand-blue-dark text-base/4 font-black">{currentHealthCareUser.name}</span>
                      Bem-vindo(a)
                    </p>

                    <Avatar imageUrl={currentHealthCareUser.avatarUrl} size="medium" shape="square" />
                  </div>
                </Dropdown>
              </div>
            </div>
          </header>

          <main className="p-4 @tablet:p-8 h-full relative">{children}</main>
        </div>
      </div>

      <ToastWrapper />
    </>
  );
}
