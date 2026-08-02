import type { ReactNode } from "react";
import type { ScenarioContext } from "@brucesantos/design-space";
import logotipo from "../assets/bloomy-negative.svg";
import { Icon } from "./Icon.js";

/**
 * Chrome do Bloomy — **espelho** do backoffice real.
 *
 * Portado de `lib/bloomy_web/components/layouts/backoffice.html.heex` e de
 * `BackofficeComponents.drawer/1`. Antes disto o shell era invenção minha: menu
 * navy, rótulos que o produto não usa, e o título da página no cabeçalho. O
 * sistema tem drawer **azul-claro** (`brand-blue`), rótulos próprios, e o
 * título dentro do conteúdo.
 *
 * Isto é UI de cliente e por isso vive no repositório do produto, nunca no motor
 * (regra de fronteira, §8). Um AppShell no pacote compartilhado forçaria Bloomy
 * e Finaya a terem a mesma anatomia de navegação.
 */

type NavItem = {
  /** O rótulo exato do sistema. */
  label: string;
  /** A rota daqui, quando a situação já foi portada. */
  path?: string;
  /** O nome exato do ícone no layout do sistema. */
  icon: string;
  /** Permissão mínima para o item aparecer, como no `:if` do layout real. */
  permission?: string;
  /** Rota do sistema real, para quem for conferir o espelho. */
  origem: string;
};

/**
 * Navegação do backoffice, na ordem do sistema.
 *
 * **Os rótulos são os de lá, não os meus.** O produto diz "Agendamentos",
 * "Leads", "Profissionais", "Biblioteca", "Colaboradores"; eu tinha inventado
 * "Agenda", "Visitas", "Equipe", "Estrutura". Um espelho que renomeia deixa de
 * ser espelho, e o vocabulário é a parte do produto que mais aparece em
 * conversa.
 *
 * Itens sem `path` existem no sistema e ainda não foram portados. Aparecem
 * desativados de propósito: esconder a lacuna faria o Design Space parecer mais
 * completo do que é.
 */
const NAV: NavItem[] = [
  { label: "Dashboard", icon: "fa-chart-pie", origem: "/backoffice" },
  { label: "Agendamentos", path: "/agenda", icon: "fa-calendar-day", permission: "schedules.list", origem: "/backoffice/agendamentos" },
  { label: "Mapa da Unidade", path: "/unit-map", icon: "fa-table", permission: "unit_maps.show", origem: "/backoffice/mapa-da-unidade" },
  { label: "Pacientes", path: "/patients", icon: "fa-users", permission: "patients.list", origem: "/backoffice/pacientes" },
  { label: "Leads", path: "/prospects", icon: "fa-user-plus", permission: "patients.create", origem: "/backoffice/visitas" },
  { label: "Na Clínica", path: "/in-clinic", icon: "fa-house-chimney-medical", permission: "closures.list", origem: "/backoffice/na-clinica" },
  { label: "Biblioteca", icon: "fa-memo-circle-check", permission: "programs.list", origem: "/backoffice/programas" },
  { label: "Profissionais", path: "/team", icon: "fa-user-md", permission: "professionals.list", origem: "/backoffice/profissionais" },
  { label: "Unidades", path: "/structure", icon: "fa-hospital", permission: "services.list", origem: "/backoffice/unidades" },
  { label: "Central de autorizações", path: "/authorizations", icon: "fa-solid fa-bullhorn", permission: "authorizations.hub", origem: "/backoffice/central_autorizacoes" },
  { label: "Operadoras", icon: "fa-building", origem: "/backoffice/operadoras" },
  { label: "Serviços", icon: "fa-suitcase-medical", permission: "services.list", origem: "/backoffice/servicos" },
  { label: "Bloqueios", icon: "fa-calendar-xmark", origem: "/backoffice/bloqueios" },
  { label: "Atendimentos", path: "/clinical-hours", icon: "fa-calendar-pen", origem: "/backoffice/atendimentos" },
  { label: "Fechamentos", path: "/closures", icon: "fa-dollar", permission: "closures.list", origem: "/backoffice/financeiro/fechamentos" },
  { label: "Listas gerenciais", path: "/management", icon: "fa-gear", permission: "management.list", origem: "/backoffice/gerencia" },
  { label: "Colaboradores", icon: "fa-solid fa-user-tie", origem: "/backoffice/usuarios" },
  { label: "Supervisão", path: "/supervision", icon: "fa-regular fa-people-group", permission: "professionals.list_supervisor", origem: "/backoffice/supervisao" },
];

/**
 * Em que superfície a tela vive.
 *
 * O Bloomy não é uma aplicação só: o backoffice tem menu lateral, e os três
 * portais externos — totem, família e operadora — são páginas próprias, abertas
 * por link ou QR Code, sem navegação de clínica nenhuma.
 *
 * Existe como propriedade explícita porque o erro contrário é silencioso e
 * embaraçoso: uma família no totem vendo "Agenda · Pacientes · Autorizações" no
 * canto da tela.
 */
export type Surface = "backoffice" | "standalone";

export function AppShell({
  context,
  title,
  subtitle,
  breadcrumb,
  actions,
  surface = "backoffice",
  children,
}: {
  context: ScenarioContext;
  title: string;
  subtitle?: string;
  breadcrumb?: { label: string; path?: string }[];
  actions?: ReactNode;
  surface?: Surface;
  children: ReactNode;
}) {
  const currentPath = typeof window === "undefined" ? "" : window.location.pathname;
  const visiveis = NAV.filter(
    (item) => item.permission === undefined || context.can(item.permission),
  );

  return (
    <div className="relative flex min-h-full min-w-0 bg-app">
      {/* Primeiro elemento focável da página. Sem ele, cada tela do backoffice
          obriga a atravessar o drawer inteiro por Tab antes de chegar ao
          conteúdo. Nos portais o drawer não existe, e o link continua útil por
          causa do cabeçalho. */}
      <a
        href="#conteudo"
        className="sr-only rounded-field bg-action px-3 py-2 text-sm font-semibold text-white focus:not-sr-only focus:absolute focus:left-3 focus:top-3 focus:z-50"
      >
        Pular para o conteúdo
      </a>

      {surface === "backoffice" && (
        <nav
          className="bloomy-drawer espelho-do-sistema sticky top-0 flex h-screen w-64 shrink-0 flex-col overflow-hidden bg-[var(--color-brand-blue)] p-4"
          aria-label="Navegação principal"
        >
          {/* Logotipo cheio com o drawer aberto, símbolo quando recolhido —
              como o sistema faz. Aqui ele fica sempre aberto, então é sempre o
              cheio. */}
          <img src={logotipo} alt="Bloomy" className="mx-auto mb-8 mt-4 h-12" />

          <ul className="m-0 flex list-none flex-col gap-2 overflow-y-auto overflow-x-hidden p-0">
            {visiveis.map((item) => {
              const atual = item.path !== undefined && currentPath.startsWith(item.path);
              const naoPortado = item.path === undefined;

              // Item sem tela ainda: visível e inativo, com o motivo. É a mesma
              // convenção das ações bloqueadas do produto — esconder faria a
              // navegação parecer completa.
              if (naoPortado) {
                return (
                  <li key={item.label}>
                    <span
                      className="flex h-12 w-full cursor-default items-center gap-2.5 rounded-lg px-4 text-lg font-bold text-white/45"
                      title={`Existe no sistema (${item.origem}) e ainda não foi portado`}
                    >
                      <Icon name={item.icon} className="w-6 shrink-0 text-center" />
                      <span className="truncate">{item.label}</span>
                    </span>
                  </li>
                );
              }

              return (
                <li key={item.label}>
                  <a
                    href={item.path}
                    aria-current={atual ? "page" : undefined}
                    onClick={(event) => {
                      event.preventDefault();
                      context.navigate(item.path!);
                    }}
                    className={[
                      "flex h-12 w-full items-center gap-2.5 rounded-lg px-4 text-lg font-bold text-white no-underline transition-colors",
                      atual
                        ? "bg-[var(--color-brand-blue-dark)]"
                        : "hover:bg-[var(--color-brand-blue-dark)]/40",
                    ].join(" ")}
                  >
                    <Icon name={item.icon} className="w-6 shrink-0 text-center" />
                    <span className="truncate">{item.label}</span>
                  </a>
                </li>
              );
            })}
          </ul>
        </nav>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        {surface === "backoffice" && (
          <header className="sticky top-0 z-40 flex items-center justify-between gap-4 bg-surface px-4 py-4 shadow-[var(--shadow-main)] lg:px-8">
            <div className="flex min-w-0 items-center gap-4">
              <Icon name="fa-sidebar" className="hidden shrink-0 text-[var(--color-brand-purple-dark)]/60 lg:block" />
              {breadcrumb && breadcrumb.length > 0 && (
                <nav aria-label="Trilha de navegação" className="min-w-0">
                  <ol className="m-0 flex list-none flex-wrap items-center gap-1.5 p-0 text-[0.8125rem] text-[var(--fg-2)]">
                    {breadcrumb.map((crumb, index) => (
                      <li key={crumb.label} className="flex items-center gap-1.5">
                        {index > 0 && (
                          <span aria-hidden="true" className="text-[var(--fg-3)]">
                            /
                          </span>
                        )}
                        {crumb.path ? (
                          <a
                            href={crumb.path}
                            className="text-action underline-offset-2 hover:underline"
                            onClick={(event) => {
                              event.preventDefault();
                              context.navigate(crumb.path!);
                            }}
                          >
                            {crumb.label}
                          </a>
                        ) : (
                          <span>{crumb.label}</span>
                        )}
                      </li>
                    ))}
                  </ol>
                </nav>
              )}
            </div>

            {/* Unidade e perfil, à direita, como no sistema: rótulo pequeno em
                cor forte sobre o valor, e um quadrado de ícone ao lado. */}
            <div className="flex shrink-0 items-center gap-x-4 md:gap-x-6">
              <div className="flex items-center gap-2">
                <p className="espelho-do-sistema m-0 hidden text-end text-sm md:block">
                  {/* Verde do sistema sobre branco: 2,81:1. Reprova AA, e é o
                      valor do produto — achado 99. */}
                  <span className="block text-base/4 font-black text-[var(--color-green)]">
                    Unidade
                  </span>
                  Vila Aurora
                </p>
                <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--color-green)]/20">
                  <Icon name="fa-hospital" className="text-[var(--color-green)]" />
                </span>
              </div>

              <div className="flex items-center gap-2">
                <p className="m-0 hidden text-end text-sm md:block">
                  <span className="block text-base/4 font-black text-[var(--color-purple)]">
                    Perfil
                  </span>
                  {context.persona?.name ?? "—"}
                </p>
                <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--color-brand-purple)]/20">
                  <Icon name="fa-user-tie" className="text-[var(--color-purple)]" />
                </span>
              </div>
            </div>
          </header>
        )}

        {/* O título vive **dentro** do conteúdo, como no sistema. Antes ele
            ficava no cabeçalho, fora do `<main>`: quem usava o atalho de pular
            aterrissava depois dele, sem nada para se orientar. */}
        <main id="conteudo" className="min-w-0 flex-1 px-4 py-6 lg:px-8">
          <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
            <div>
              <h1 className="m-0 text-2xl font-bold text-navy">{title}</h1>
              {subtitle && <p className="m-0 mt-1 text-sm text-[var(--fg-2)]">{subtitle}</p>}
            </div>
            {actions && <div className="flex flex-wrap items-start gap-2.5">{actions}</div>}
          </div>

          {children}
        </main>
      </div>
    </div>
  );
}
