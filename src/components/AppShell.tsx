import type { ReactNode } from "react";
import type { ScenarioContext } from "@brucesantos/design-space";
import symbol from "../assets/bloomy-symbol-negative.svg";

/**
 * Chrome do Bloomy: drawer navy à esquerda, cabeçalho com contexto de unidade e
 * perfil, conteúdo sobre o fundo ciano claro.
 *
 * Isto é UI de cliente e por isso vive no repositório do produto, nunca no motor
 * (regra de fronteira, §8). Um AppShell no pacote compartilhado forçaria Bloomy
 * e Finaya a terem a mesma anatomia de navegação.
 */

type NavItem = {
  label: string;
  path: string;
  /** Permissão mínima para o item aparecer. */
  permission: string;
};

const NAV: NavItem[] = [
  { label: "Agenda", path: "/agenda", permission: "agenda.read" },
  { label: "Pacientes", path: "/patients", permission: "patients.read" },
  { label: "Financeiro", path: "/finance", permission: "finance.read" },
];

export function AppShell({
  context,
  title,
  subtitle,
  breadcrumb,
  actions,
  children,
}: {
  context: ScenarioContext;
  title: string;
  subtitle?: string;
  breadcrumb?: { label: string; path?: string }[];
  actions?: ReactNode;
  children: ReactNode;
}) {
  const currentPath = typeof window === "undefined" ? "" : window.location.pathname;

  return (
    <div className="flex min-h-full bg-app">
      {/* O link de pulo é o primeiro elemento focável da página. Sem ele, cada
          tela obriga a atravessar o drawer inteiro por Tab antes de chegar ao
          conteúdo — e o drawer tem três itens em toda tela. */}
      <a
        href="#conteudo"
        className="sr-only rounded-field bg-action px-3 py-2 text-sm font-semibold text-white focus:not-sr-only focus:absolute focus:left-3 focus:top-3 focus:z-50"
      >
        Pular para o conteúdo
      </a>

      <nav
        className="bloomy-drawer sticky top-0 flex h-screen w-[220px] shrink-0 flex-col gap-1 bg-navy px-3 py-5 text-white"
        aria-label="Navegação principal"
      >
        <div className="mb-5 flex items-center gap-2.5 px-2">
          <img src={symbol} alt="" width={26} height={26} aria-hidden="true" />
          <span className="text-lg font-extrabold tracking-tight">Bloomy</span>
        </div>

        {NAV.filter((item) => context.can(item.permission)).map((item) => {
          const isCurrent = currentPath.startsWith(item.path);
          return (
            <a
              key={item.path}
              href={item.path}
              aria-current={isCurrent ? "page" : undefined}
              onClick={(event) => {
                event.preventDefault();
                context.navigate(item.path);
              }}
              className={[
                "rounded-field px-3 py-2 text-[15px] font-semibold no-underline transition-colors",
                isCurrent
                  ? "bg-white/12 text-white shadow-[inset_3px_0_0_0_var(--color-cyan-brand)]"
                  : "text-ink-300 hover:bg-white/8 hover:text-white",
              ].join(" ")}
            >
              {item.label}
            </a>
          );
        })}

        <div className="mt-auto border-t border-white/10 px-2 pt-4">
          <p className="m-0 text-[11px] font-black uppercase tracking-wide text-ink-300">Perfil</p>
          <p className="m-0 mt-0.5 text-sm font-semibold text-white">
            {context.persona?.name ?? "—"}
          </p>
        </div>
      </nav>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="border-b border-[var(--border-soft)] bg-surface px-7 py-5">
          {breadcrumb && breadcrumb.length > 0 && (
            <nav aria-label="Trilha de navegação" className="mb-1.5">
              <ol className="m-0 flex list-none flex-wrap items-center gap-1.5 p-0 text-[13px] text-[var(--fg-2)]">
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

          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h1 className="m-0 text-2xl font-bold text-navy">{title}</h1>
              {subtitle && <p className="m-0 mt-1 text-sm text-[var(--fg-2)]">{subtitle}</p>}
            </div>
            {actions && <div className="flex flex-wrap items-start gap-2.5">{actions}</div>}
          </div>
        </header>

        <main id="conteudo" className="min-w-0 flex-1 px-7 py-6">
          {children}
        </main>
      </div>
    </div>
  );
}
