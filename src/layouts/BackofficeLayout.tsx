import { useId, useRef, useState, type ReactNode } from "react";
import type { ScenarioContext } from "@brucesantos/design-space";
import logotipo from "../assets/bloomy-negative.svg";
import simbolo from "../assets/bloomy-symbol-negative.svg";
import { Icon } from "../components/Icon.js";
import { Avatar } from "../components/Layout.js";

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
  /** O nome exato do ícone no layout do sistema. */
  icon: string;
  /** Permissão mínima para o item aparecer, como no `:if` do layout real. */
  permission?: string;
  /** Rota do sistema real. */
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
 * O item é filtrado por permissão, como o `:if` do layout real.
 */
const NAV: NavItem[] = [
  { label: "Dashboard", icon: "fa-chart-pie", origem: "/backoffice" },
  { label: "Agendamentos", icon: "fa-calendar-day", permission: "schedules.list", origem: "/backoffice/agendamentos" },
  { label: "Mapa da Unidade", icon: "fa-table", permission: "unit_maps.show", origem: "/backoffice/mapa-da-unidade" },
  { label: "Pacientes", icon: "fa-users", permission: "patients.list", origem: "/backoffice/pacientes" },
  { label: "Leads", icon: "fa-user-plus", permission: "patients.create", origem: "/backoffice/visitas" },
  { label: "Na Clínica", icon: "fa-house-chimney-medical", permission: "closures.list", origem: "/backoffice/na-clinica" },
  { label: "Biblioteca", icon: "fa-memo-circle-check", permission: "programs.list", origem: "/backoffice/programas" },
  { label: "Profissionais", icon: "fa-user-md", permission: "professionals.list", origem: "/backoffice/profissionais" },
  { label: "Unidades", icon: "fa-hospital", permission: "services.list", origem: "/backoffice/unidades" },
  { label: "Central de autorizações", icon: "fa-solid fa-bullhorn", permission: "authorizations.hub", origem: "/backoffice/central_autorizacoes" },
  { label: "Operadoras", icon: "fa-building", origem: "/backoffice/operadoras" },
  { label: "Serviços", icon: "fa-suitcase-medical", permission: "services.list", origem: "/backoffice/servicos" },
  { label: "Bloqueios", icon: "fa-calendar-xmark", origem: "/backoffice/bloqueios" },
  { label: "Atendimentos", icon: "fa-calendar-pen", origem: "/backoffice/atendimentos" },
  { label: "Fechamentos", icon: "fa-dollar", permission: "closures.list", origem: "/backoffice/financeiro/fechamentos" },
  { label: "Listas gerenciais", icon: "fa-gear", permission: "management.list", origem: "/backoffice/gerencia" },
  { label: "Colaboradores", icon: "fa-solid fa-user-tie", origem: "/backoffice/usuarios" },
  { label: "Supervisão", icon: "fa-regular fa-people-group", permission: "professionals.list_supervisor", origem: "/backoffice/supervisao" },
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

/** O pedaço do contexto do motor que o layout usa. */
export type LayoutContext = Pick<ScenarioContext, "navigate" | "can" | "persona">;

export function BackofficeLayout({
  context,
  active,
  title,
  subtitle,
  breadcrumb,
  actions,
  surface = "backoffice",
  showPageHeading = true,
  children,
}: {
  /** Numa tela de feature, o `context` que ela recebe do motor. */
  context?: LayoutContext;
  /** Rótulo do item do menu aberto: "Pacientes". */
  active?: string;
  title: string;
  subtitle?: string;
  breadcrumb?: { label: string; path?: string }[];
  actions?: ReactNode;
  surface?: Surface;
  showPageHeading?: boolean;
  children: ReactNode;
}) {
  const navigate = (to: string) => context?.navigate(to);

  /**
   * O drawer nasce **recolhido**, como no sistema: o `<aside>` do monólito tem
   * `data-collapsed="true"` no atributo inicial, e nesse estado ele fica com
   * 72px no desktop, só ícone.
   *
   * Um detalhe do original que vale conhecer antes de mexer: o `aside` e o link
   * usam a mesma palavra com sentidos opostos. No `aside`, `collapsed=true` é o
   * estreito; no link, quem produz o estreito é `collapsed=false`. Aqui o estado
   * é um só e tem nome afirmativo — `expandido` —, para não herdar a inversão.
   */
  const [expandido, setExpandido] = useState(false);
  const menuId = useId();
  const logoMobile = useRef<HTMLButtonElement>(null);
  const visiveis = NAV.filter((item) => !item.permission || !context || context.can(item.permission));

  return (
    <div className="relative flex min-h-full min-w-0 bg-app"
      onKeyDown={(event) => {
        if (event.key === "Escape" && expandido) {
          setExpandido(false);
          logoMobile.current?.focus();
        }
      }}>
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

      {/* O fundo escuro do drawer sobreposto, e só abaixo de `lg`.

          `drawer-overlay` do original: `data-[collapsed=true]:block` mais
          `lg:hidden`. Acima de `lg` o drawer é uma coluna da página e não tem o
          que escurecer; abaixo, ele cobre o conteúdo e precisa de um jeito de
          fechar que não seja procurar o botão. */}
      {surface === "backoffice" && expandido && (
        /* `div` e não `button`, como no original: o fundo é atalho de ponteiro,
           não um controle a mais. Como botão ele duplicava o nome acessível do
           botão do cabeçalho — dois "Fechar a navegação" na mesma tela, um deles
           uma área invisível de tela inteira na ordem de foco. Quem navega por
           teclado fecha pelo mesmo botão que abriu. */
        <div
          aria-hidden="true"
          onClick={() => { setExpandido(false); logoMobile.current?.focus(); }}
          className="fixed inset-0 z-40 bg-[var(--color-neutral-900)]/80 @desktop:hidden"
        />
      )}

      {surface === "backoffice" && (
        <nav
          id={menuId}
          className={[
            "bloomy-drawer espelho-do-sistema flex max-h-screen flex-col overflow-hidden bg-[var(--color-brand-blue)]",
            "transition-[width] duration-500",
            /* Abaixo de `lg` o drawer é `fixed` e **fecha em zero**: ele sai da
               linha do conteúdo e volta por cima quando alguém o abre. A partir
               de `lg` vira coluna `sticky`, e recolhido é a barra de 72px.

               Estava `sticky` em toda largura, com a barra de 72px sempre
               presente. Num telefone de 375px isso é um quinto da tela gasto
               num trilho de um ícone — e as três larguras que sobravam para o
               conteúdo eram 223px depois dos recuos do `main` e do cartão.

               É o original: `fixed ... data-[collapsed=true]:w-0` e
               `lg:sticky ... data-[collapsed=true]:lg:w-[72px]`. */
            "fixed bottom-0 left-0 top-0 z-50",
            expandido ? "w-64 p-4" : "w-0 p-0",
            "@desktop:sticky @desktop:h-screen @desktop:shrink-0",
            expandido ? "@desktop:w-64 @desktop:p-4" : "@desktop:w-[72px] @desktop:p-2",
          ].join(" ")}
          aria-label="Navegação principal"
        >
          {/* Logotipo cheio com o drawer aberto, símbolo quando recolhido. */}
          <img
            src={expandido ? logotipo : simbolo}
            alt="Bloomy"
            className={["mx-auto mb-8 mt-4", expandido ? "h-12" : "h-12 w-12"].join(" ")}
          />

          <ul className="m-0 flex list-none flex-col gap-2 overflow-y-auto overflow-x-hidden p-0">
            {visiveis.map((item) => {
              const aberto = item.label === active;
              return (
                <li key={item.label}>
                  <a
                    href={item.origem}
                    aria-current={aberto ? "page" : undefined}
                    onClick={(event) => event.preventDefault()}
                    // Recolhido, o rótulo sai da tela mas continua acessível: o
                    // `title` e o `aria-label` seguram o nome para leitor de tela
                    // e para quem passa o mouse. O sistema resolve isso com um
                    // tooltip; o efeito para quem depende do nome é o mesmo.
                    title={expandido ? undefined : item.label}
                    aria-label={expandido ? undefined : item.label}
                    className={[
                      "flex h-12 items-center gap-2.5 rounded-lg text-lg font-bold text-white no-underline transition-colors",
                      expandido ? "w-full px-4" : "mx-auto w-12 justify-center px-2",
                      aberto ? "bg-[var(--color-brand-blue-dark)]" : "hover:bg-[var(--color-brand-blue-dark)]",
                    ].join(" ")}
                  >
                    <Icon name={item.icon} className="w-6 shrink-0 text-center" />
                    {expandido && <span className="truncate">{item.label}</span>}
                  </a>
                </li>
              );
            })}
          </ul>
        </nav>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        {/*
          Cabeçalho — espelho de `backoffice.html.heex:141-324`.

          `justify-end md:justify-between` é de lá: abaixo de `md` o breadcrumb
          está escondido e o grupo da direita vai inteiro para a borda. Com
          `justify-between` fixo, o botão do drawer ficava sozinho na esquerda de
          um cabeçalho vazio.
        */}
        {surface === "backoffice" && (
          <header className="sticky top-0 z-40 flex items-stretch">
            {/* O botão do drawer no telefone — `flex lg:hidden` no original, com
                o símbolo sobre o azul da marca. Sem ele o drawer fechado em zero
                não teria como abrir abaixo de `lg`: o botão da barra do
                cabeçalho é `hidden lg:block`, porque acima de `lg` ele alterna
                entre 72px e 256px, e aqui a alternância é entre nada e tudo. */}
            <button
              type="button"
              ref={logoMobile}
              aria-controls={menuId}
              onClick={() => {
                setExpandido((antes) => !antes);
                if (!expandido) requestAnimationFrame(() => document.getElementById(menuId)?.querySelector<HTMLAnchorElement>("a")?.focus());
              }}
              aria-expanded={expandido}
              aria-label={expandido ? "Fechar a navegação" : "Abrir a navegação"}
              className="flex min-w-20 items-center justify-center bg-[var(--color-brand-blue)] @desktop:hidden"
            >
              <img src={simbolo} alt="" className="h-12 w-12" />
            </button>

            <div className="relative flex w-full items-center justify-end bg-surface px-4 py-4 shadow-[var(--shadow-main)] @tablet:justify-between @desktop:px-8">
            <div className="flex gap-4">
              <div className="hidden @desktop:block">
                <button
                  type="button"
                  onClick={() => setExpandido((antes) => !antes)}
                  aria-expanded={expandido}
                  aria-label={expandido ? "Recolher a navegação" : "Expandir a navegação"}
                  className="flex h-5 w-5 shrink-0 items-center justify-center text-[var(--color-brand-purple-dark)]/60"
                >
                  <Icon name="fa-sidebar" />
                </button>
              </div>

              {/*
               * `breadcrumbs/1`: separador de chevron, 14px em negrito, e o item
               * atual em roxo cheio contra os anteriores a 50%. Antes disto era
               * invenção minha — barra "/" como separador, 13px, links na cor de
               * ação. Escondido abaixo de `md`, como lá.
               *
               * O `aria-label` é o do original, "Breadcrumb", e não a tradução
               * que eu tinha posto.
               */}
              {breadcrumb && breadcrumb.length > 0 && (
                <nav aria-label="Breadcrumb" className="hidden min-w-0 @tablet:block">
                  <ol className="m-0 flex list-none flex-wrap items-center gap-2 p-0">
                    {breadcrumb.map((crumb, index) => (
                      <li key={crumb.label} className="flex items-center gap-2">
                        {index > 0 && (
                          <Icon
                            name="fa-chevron-right"
                            className="text-xs text-[var(--color-brand-purple-dark)]/30"
                          />
                        )}
                        {crumb.path ? (
                          <a
                            href={crumb.path}
                            className="espelho-do-sistema text-sm font-semibold text-[var(--color-brand-purple-dark)]/50 no-underline transition-colors hover:text-[var(--color-brand-purple)]"
                            onClick={(event) => {
                              event.preventDefault();
                              navigate(crumb.path!);
                            }}
                          >
                            {crumb.label}
                          </a>
                        ) : (
                          <span className="text-sm font-semibold text-[var(--color-brand-purple-dark)]">
                            {crumb.label}
                          </span>
                        )}
                      </li>
                    ))}
                  </ol>
                </nav>
              )}
            </div>

            {/*
             * Unidade, perfil, pessoa e notificações — os quatro blocos do
             * sistema, nesta ordem. Faltavam os dois últimos.
             *
             * No original os três primeiros são `dropdown/1`: trocar de unidade,
             * trocar de papel, e "Meu perfil / Base de Conhecimento / Sair". Aqui
             * são estáticos — o Design Space troca unidade e papel pelo painel do
             * motor, e um menu que abre para links mortos seria pior que nenhum.
             * A anatomia visual é a de lá.
             */}
            <div className="flex shrink-0 items-center gap-x-4 @tablet:gap-x-6">
              <div className="flex items-center gap-2">
                <p className="espelho-do-sistema m-0 hidden text-end text-sm @tablet:block">
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
                <p className="m-0 hidden text-end text-sm @tablet:block">
                  <span className="block text-base/4 font-black text-[var(--color-purple)]">
                    Perfil
                  </span>
                  {context?.persona?.name ?? "Admin"}
                </p>
                <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--color-brand-purple)]/20">
                  <Icon name="fa-user-tie" className="text-[var(--color-purple)]" />
                </span>
              </div>

              {/* A pessoa: nome em `brand-blue-dark` sobre "Bem-vindo(a)", e o
                  avatar quadrado. O par do nome dá 3,40:1 e já está registrado
                  como divergência do produto. */}
              <div className="flex items-center gap-2">
                <p className="espelho-do-sistema m-0 hidden text-end text-sm @tablet:block">
                  <span className="block text-base/4 font-black text-[var(--color-brand-blue-dark)]">
                    Marcos Vinícius Gimenes
                  </span>
                  Bem-vindo(a)
                </p>
                <Avatar shape="square" size="medium" />
              </div>

              {/* `NotificationComponent`: quadrado laranja com o sino, e a
                  contagem num selo roxo com borda branca, saindo do canto.

                  O sino é laranja do produto sobre o mesmo laranja a 20%: 2,02:1,
                  contra os 3:1 que a WCAG 1.4.11 pede para elemento não textual.
                  O axe não o alcança — é um glifo de fonte num `span` sem texto —
                  então a marca de espelho aqui não esconde nada dele; ela existe
                  para o par ficar registrado e medido. O selo roxo passa com
                  4,89, e é ele que carrega o número. */}
              <a
                href="/notifications"
                aria-label="Notificações: 2 não lidas"
                onClick={(event) => {
                  event.preventDefault();
                  navigate("/notifications");
                }}
                className="espelho-do-sistema relative flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[var(--color-orange)]/20"
              >
                <Icon name="fa-bell" className="text-[var(--color-orange)]" />
                <span
                  aria-hidden="true"
                  className="absolute -right-2 -top-2 inline-flex h-6 w-6 items-center justify-center rounded-lg border-2 border-white bg-[var(--color-purple)] text-xs font-bold text-white"
                >
                  2
                </span>
              </a>
            </div>
            </div>
          </header>
        )}

        {/* O título vive **dentro** do conteúdo, como no sistema. Antes ele
            ficava no cabeçalho, fora do `<main>`: quem usava o atalho de pular
            aterrissava depois dele, sem nada para se orientar. */}
        <main id="conteudo" className="min-w-0 flex-1 px-4 py-6 @desktop:px-8">
          {showPageHeading ? (
            <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
              <div>
                <h1 className="m-0 text-2xl font-bold text-navy">{title}</h1>
                {subtitle && <p className="m-0 mt-1 text-sm text-[var(--fg-2)]">{subtitle}</p>}
              </div>
              {actions && <div className="flex flex-wrap items-start gap-2.5">{actions}</div>}
            </div>
          ) : <h1 className="sr-only">{title}</h1>}

          {children}
        </main>
      </div>
    </div>
  );
}
