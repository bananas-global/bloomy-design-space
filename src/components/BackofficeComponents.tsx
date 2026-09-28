import { useEffect, useRef, useState, type MouseEvent, type ReactNode } from "react";
import { createPortal } from "react-dom";
import symbolNegative from "../assets/bloomy-symbol-negative.svg";
import logoNegative from "../assets/bloomy-negative.svg";
import { Icon } from "./Icon.js";
import { Avatar } from "./Layout.js";

/**
 * `backoffice_components.ex` → `drawer/1`, `form_grid/1`, `timer/1`,
 * `toast_wrapper/1` (reexportado de `Action.tsx`), `breadcrumbs/1`.
 *
 * Diferença inevitável: `toggle_drawer/1` (que troca `data-collapsed` em cinco
 * lugares) vira o par `collapsed`/`onToggle`.
 */

const cx = (...classes: unknown[]) => (classes.flat(3) as unknown[]).filter(Boolean).join(" ");

/* ------------------------------------------------------------------ */
/* drawer/1                                                            */
/* ------------------------------------------------------------------ */

export type DrawerItem = { to: string; title: string; icon: string; exact?: boolean };

/** `item_active?/2`. */
export function itemActive(currentPath: string | undefined, item: DrawerItem): boolean {
  const path = currentPath ?? "";
  return item.exact ? path === item.to : path.startsWith(item.to);
}

/** `link_to_id/1`. */
const linkToId = (link: string) => `${link.replace(/^\//, "").replace(/\//g, "-")}-tooltip`;

/** `tooltip/1` do item: o hook só mostra quando o gatilho tem `data-active="true"`. */
function DrawerTooltip({ id, active, title, children }: { id: string; active: boolean; title: string; children: ReactNode }) {
  const [position, setPosition] = useState<{ left: number; top: number } | null>(null);
  const trigger = useRef<HTMLDivElement>(null);

  return (
    <div id={id} data-tooltip-placement="right">
      <div
        ref={trigger}
        data-tooltip-trigger
        data-active={active ? "true" : "false"}
        onMouseEnter={() => {
          if (!active || !trigger.current) return;
          const rect = trigger.current.getBoundingClientRect();
          setPosition({ left: rect.right + 4, top: rect.top + rect.height / 2 });
        }}
        onMouseLeave={() => setPosition(null)}
      >
        {children}
      </div>
      {position &&
        createPortal(
          <div
            data-tooltip-content
            className="bg-neutral-900 text-white rounded px-2 py-1 text-sm w-max fixed z-[80]"
            style={{ left: `${position.left}px`, top: `${position.top}px`, transform: "translateY(-50%)" }}
          >
            <p>{title}</p>
          </div>,
          document.body,
        )}
    </div>
  );
}

export function Drawer({
  currentPath,
  className,
  item,
  collapsed = true,
  onToggle,
  onNavigate,
}: {
  currentPath?: string;
  className?: string;
  item: DrawerItem[];
  /** `data-collapsed` do `aside`: `true` é a barra estreita (e zero no celular). */
  collapsed?: boolean;
  onToggle?: () => void;
  onNavigate?: (to: string) => void;
}) {
  const linkCollapsed = collapsed ? "false" : "true";

  return (
    <>
      <div
        id="drawer-overlay"
        data-collapsed={collapsed ? "false" : "true"}
        className="fixed z-50 inset-0 hidden data-[collapsed=true]:block data-[collapsed=true]:bg-neutral-900/80 lg:data-[collapsed=true]:hidden"
        onClick={onToggle}
      ></div>
      <aside
        id="drawer"
        data-collapsed={collapsed ? "true" : "false"}
        className={cx(
          "group flex max-h-screen flex-col top-0 left-0 bg-brand-blue transition-[width] duration-500 z-[50] overflow-hidden",
          "fixed left-0 bottom-0 data-[collapsed=false]:w-64 data-[collapsed=false]:p-4 data-[collapsed=true]:w-0 data-[collapsed=true]:p-0",
          "lg:sticky lg:data-[collapsed=false]:w-64 lg:data-[collapsed=false]:p-4 lg:data-[collapsed=true]:w-[72px] lg:data-[collapsed=true]:p-2",
          className,
        )}
      >
        <img src={symbolNegative} alt="Logo da Bloomy" className="lg:group-data-[collapsed=false]:hidden w-12 h-12 mx-auto mt-4 mb-8" />

        <img src={logoNegative} alt="Logo da Bloomy" className="hidden lg:group-data-[collapsed=false]:block h-12 mx-auto mt-4 mb-8" />

        <nav className="flex-1 overflow-y-auto hidden-scrollbar overflow-x-hidden">
          <ul className="flex flex-col gap-2" data-link-container>
            {item.map((entry) => (
              <li key={entry.to}>
                <DrawerTooltip id={linkToId(entry.to)} active={collapsed} title={entry.title}>
                  <a
                    className={cx(
                      "drawer__link flex gap-2.5 h-12 items-center px-4 w-full rounded-lg text-white font-bold text-lg",
                      "data-[collapsed=false]:w-12 data-[collapsed=false]:mx-auto",
                      "data-[collapsed=false]:px-2 data-[collapsed=false]:justify-center transition-colors",
                      "data-[collapsed=false]:[&>span:last-child]:opacity-0 data-[collapsed=false]:[&>span:last-child]:hidden",
                      itemActive(currentPath, entry) ? "bg-brand-blue-dark" : "hover:bg-brand-blue-dark/40",
                    )}
                    data-collapsed={linkCollapsed}
                    href={entry.to}
                    onClick={(event: MouseEvent) => {
                      event.preventDefault();
                      onNavigate?.(entry.to);
                    }}
                  >
                    <Icon name={entry.icon} className="w-6 text-center" />
                    <span>{entry.title}</span>
                  </a>
                </DrawerTooltip>
              </li>
            ))}
          </ul>
        </nav>
      </aside>
    </>
  );
}

/* ------------------------------------------------------------------ */
/* form_grid/1                                                         */
/* ------------------------------------------------------------------ */

export function FormGrid({
  className,
  variant = "medium",
  children,
}: {
  className?: string;
  variant?: "small" | "medium";
  children: ReactNode;
}) {
  return (
    <div
      className={cx(
        "mt-6 grid gap-6",
        variant === "small" && "grid-cols-1 lg:grid-cols-2 lg:grid-cols-2",
        variant === "medium" && "grid-cols-1 lg:grid-cols-2 lg:grid-cols-3",
        className,
      )}
    >
      {children}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* timer/1                                                             */
/* ------------------------------------------------------------------ */

/** O `custom_service` que `timer/1` lê, já resolvido pelo `case` do tipo de agenda. */
export type TimerCustomService = {
  id: string;
  /** `started_at`, ISO. */
  startedAt: string;
  /** Nome do paciente/responsável, ou o título da agenda de profissional. */
  title?: string;
  avatarUrl?: string;
  /** `translate_enum(schedule_type)`: "Paciente", "AT"… */
  scheduleType: string;
};

/** O hook `Timer`: `mm:ss`, ou `hh:mm:ss` a partir de uma hora. */
function formatElapsed(ms: number): string {
  if (ms <= 0) return "00:00";
  const pad = (n: number) => String(Math.floor(n)).padStart(2, "0");
  const hours = pad(ms / 3600000);
  const minutes = pad((ms % 3600000) / 60000);
  const seconds = pad((ms % 60000) / 1000);
  return hours !== "00" ? `${hours}:${minutes}:${seconds}` : `${minutes}:${seconds}`;
}

export function Timer({
  customService,
  now,
  className,
  onNavigate,
}: {
  customService: TimerCustomService;
  /** Relógio de referência (ISO). O componente não lê a hora do sistema; conta a partir daqui. */
  now: string;
  className?: string;
  onNavigate?: (to: string) => void;
}) {
  const [ticks, setTicks] = useState(0);
  useEffect(() => {
    const interval = window.setInterval(() => setTicks((t) => t + 1), 1000);
    return () => window.clearInterval(interval);
  }, []);
  const elapsed = Date.parse(now) - Date.parse(customService.startedAt) + ticks * 1000;
  const to = `/backoffice/atendimentos/${customService.id}`;

  return (
    <a
      href={to}
      onClick={(event) => {
        event.preventDefault();
        onNavigate?.(to);
      }}
      title="Voltar para o atendimento"
      className={cx("block lg:relative lg:h-0 lg:w-72 lg:flex-none lg:w-80", className)}
    >
      <div className="bg-brand-blue/20 flex items-center justify-between gap-4 h-14 py-1.5 px-2 rounded-lg text-brand-blue-dark lg:absolute lg:inset-x-0 lg:top-1/2 lg:z-10 lg:-translate-y-1/2 lg:px-4">
        <div className="flex flex-col items-center justify-center">
          <Icon name="fa-clock" />

          <span className="font-bold text-sm lg:text-base" id="header_timer" data-value={customService.startedAt}>
            {formatElapsed(elapsed)}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Avatar imageUrl={customService.avatarUrl} shape="square" size="medium" />

          <div className="hidden md:block">
            <p className="truncate leading-4 font-black max-w-48">{customService.title}</p>
            <p className="truncate text-xs">{customService.scheduleType}</p>
          </div>
        </div>
      </div>
    </a>
  );
}

/* ------------------------------------------------------------------ */
/* toast_wrapper/1                                                     */
/* ------------------------------------------------------------------ */

// Implementado em `Action.tsx`, junto do `copy_button/1` que o alimenta.
export { ToastWrapper, showToast, type ToastDetail } from "./Action.js";

/* ------------------------------------------------------------------ */
/* breadcrumbs/1                                                       */
/* ------------------------------------------------------------------ */

export type BreadcrumbItem = { label: string; to?: string };

export function Breadcrumbs({ items = [], onNavigate }: { items?: BreadcrumbItem[]; onNavigate?: (to: string) => void }) {
  const lastIndex = items.length;

  return (
    <nav aria-label="Breadcrumb" className="hidden md:block">
      <ol className="flex flex-wrap items-center gap-2">
        {items.map((item, i) => {
          const index = i + 1;
          return (
            <li key={`${index}-${item.label}`} className="flex items-center gap-2">
              {index > 1 && <Icon name="fa-chevron-right" className="text-brand-purple-dark/30 text-xs" />}

              {item.to && (
                <a
                  href={item.to}
                  onClick={(event) => {
                    event.preventDefault();
                    onNavigate?.(item.to!);
                  }}
                  className="text-sm font-semibold text-brand-purple-dark/50 transition-colors hover:text-brand-purple"
                >
                  {item.label}
                </a>
              )}

              {item.to == null && (
                <span
                  className={cx(
                    "text-sm font-semibold text-brand-purple-dark",
                    lastIndex === index ? "text-brand-purple-dark" : "text-brand-purple-dark/50",
                  )}
                >
                  {item.label}
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
