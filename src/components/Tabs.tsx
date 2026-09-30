import { useEffect, useLayoutEffect, useRef, useState, type ReactNode, type RefObject } from "react";
import { Icon } from "./Icon.js";
import { Card } from "./Card.js";
import { Dropdown } from "./Overlay.js";

/**
 * `tab_components.ex` → `wrapper/1` (`tabs/1`) e `card_wrapper/1` (`card_tabs/1`);
 * `button_tab_components.ex` → `wrapper/1` (`button_tabs/1`);
 * `dropdown_tabs_components.ex` → `wrapper/1` (`dropdown_tabs/1`);
 * `lazy_tab_component.ex` → `wrapper/1` (`lazy_tabs/1`).
 *
 * Os hooks (`TabsController`, `ButtonTabsController`, `DropdownTabController`,
 * `.LazyTab`) viram estado React. Diferença inevitável: `tracker_id` (a aba
 * guardada na query string) e a marcação de erro por aba (`validate_tab`) não
 * foram portados; o ícone de erro fica no markup, sempre escondido.
 */

const cx = (...classes: unknown[]) => (classes.flat(3) as unknown[]).filter(Boolean).join(" ");

/** `title_to_slug/1`. */
export function titleToSlug(title: string): string {
  return title
    .toLowerCase()
    .trim()
    .normalize("NFD")
    .replace(/[^\p{L}\p{N}_\s]/gu, "")
    .replace(/[^a-z0-9\s-]/g, "  ")
    .replace(/[\s-]+/g, "-");
}

/** Reposiciona o `data-tab-marker` sob o elemento ativo, como os hooks. */
function useMarker(
  marker: RefObject<HTMLDivElement | null>,
  target: () => HTMLElement | null | undefined,
  measure: (el: HTMLElement, marker: HTMLDivElement) => void,
  deps: unknown[],
) {
  useLayoutEffect(() => {
    const el = target();
    const m = marker.current;
    if (!el || !m) return;
    const update = () => {
      measure(el, m);
      m.classList.remove("hidden");
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => observer.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}

const lineMarker = (el: HTMLElement, m: HTMLDivElement) => {
  m.style.width = `${el.offsetWidth}px`;
  m.style.height = `${el.offsetHeight + 4}px`;
  m.style.left = `${el.offsetLeft}px`;
};

/* ------------------------------------------------------------------ */
/* tab_components.ex                                                   */
/* ------------------------------------------------------------------ */

function TabButton({
  id,
  tabId,
  title,
  mobileTitle,
  size = "normal",
  active,
  onClick,
}: {
  id: number;
  tabId: string;
  title: string;
  mobileTitle?: string;
  size?: "normal" | "large";
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      id={`${tabId}-tab-${id}`}
      type="button"
      className={cx(
        "relative font-bold transition-all rounded-md cursor-pointer whitespace-nowrap",
        size === "normal" && "px-3 py-2 text-lg",
        size === "large" && "px-3 py-4 text-lg",
        active ? "text-blue-dark" : "text-neutral-400",
      )}
      data-tab-button
      data-slug={titleToSlug(title)}
      onClick={onClick}
    >
      <span className={mobileTitle ? "hidden md:inline" : undefined}>{title}</span>
      <span className={mobileTitle ? "inline md:hidden" : undefined}>{mobileTitle}</span>
      <span className="hidden" data-tab-error>
        <Icon name="fa-warning text-red" type="solid" />
      </span>
    </button>
  );
}

export type TabSlot = { title: string; mobileTitle?: string; content: ReactNode };

export function Tabs({
  id,
  className,
  contentClass,
  tab,
}: {
  id: string;
  className?: string;
  contentClass?: string;
  tab: TabSlot[];
}) {
  const [current, setCurrent] = useState(0);
  const list = useRef<HTMLDivElement>(null);
  const marker = useRef<HTMLDivElement>(null);
  useMarker(marker, () => list.current?.querySelector<HTMLElement>(`#${CSS.escape(`${id}-tab-${current}`)}`), lineMarker, [current, id]);

  return (
    <div id={id} className="relative w-full">
      <div
        ref={list}
        className={cx(
          "relative w-full text-gray-500 select-none flex border-b border-neutral-100 overflow-y-hidden overflow-x-auto thin-scrollbar pb-1",
          className,
        )}
      >
        {tab.map((t, index) => (
          <TabButton key={index} id={index} tabId={id} title={t.title} mobileTitle={t.mobileTitle} active={index === current} onClick={() => setCurrent(index)} />
        ))}

        <div ref={marker} className="absolute left-0 w-1/2 h-full duration-300 ease-out pointer-events-none hidden" data-tab-marker>
          <div className="w-full h-full border-b-4 border-blue"></div>
        </div>
      </div>

      <div className={cx("relative w-full mt-4 content", contentClass)}>
        {tab.map((t, index) => (
          <div key={index} id={`${id}-tab-${index}-content`} className={cx("relative", index !== current && "hidden")} data-tab-content>
            {t.content}
          </div>
        ))}
      </div>
    </div>
  );
}

export type CardTabSlot = { title: string; noCard?: boolean; content: ReactNode };

export function CardTabs({
  id,
  header,
  tab,
  initialTab = 0,
  children,
}: {
  id: string;
  header: ReactNode;
  tab: CardTabSlot[];
  /** A aba aberta ao montar. Faz o papel de `tracker_id` (a aba na query string), que não foi portado. */
  initialTab?: number;
  children?: ReactNode;
}) {
  const [current, setCurrent] = useState(initialTab);
  const list = useRef<HTMLDivElement>(null);
  const marker = useRef<HTMLDivElement>(null);
  useMarker(marker, () => list.current?.querySelector<HTMLElement>(`#${CSS.escape(`${id}-tab-${current}`)}`), lineMarker, [current, id]);
  const slug = tab[current] ? titleToSlug(tab[current].title) : undefined;

  return (
    <div id={id} className="relative w-full">
      <Card className="mb-6 p-0!">
        <div className="group p-6" data-tab-header data-tab={slug}>
          {header}
        </div>

        <div
          ref={list}
          className="relative w-full text-gray-500 select-none flex border-t border-brand-purple-dark/10 overflow-y-hidden overflow-x-auto thin-scrollbar pb-1 px-6"
        >
          {tab.map((t, index) => (
            <TabButton key={index} id={index} tabId={id} title={t.title} size="large" active={index === current} onClick={() => setCurrent(index)} />
          ))}

          <div ref={marker} className="absolute left-0 w-1/2 h-full duration-300 ease-out pointer-events-none hidden" data-tab-marker>
            <div className="w-full h-full border-b-4 border-blue"></div>
          </div>
        </div>
      </Card>

      <div className="relative w-full content">
        {tab.map((t, index) => (
          <div key={index} id={`${id}-tab-${index}-content`} className={cx("relative", index !== current && "hidden")} data-tab-content>
            {t.noCard ? <div>{t.content}</div> : <Card>{t.content}</Card>}
          </div>
        ))}

        {children}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* button_tab_components.ex                                            */
/* ------------------------------------------------------------------ */

export type ButtonTabSlot = { title: string; disabled?: boolean; content: ReactNode };

export function ButtonTabs({
  id,
  size = "small",
  className,
  tab,
  actions,
  initialTab = 0,
  onChange,
}: {
  id: string;
  size?: "small" | "normal";
  className?: string;
  tab: ButtonTabSlot[];
  actions?: ReactNode;
  /** A aba aberta ao montar, como no `CardTabs`. */
  initialTab?: number;
  /** Avisa a troca de aba, para o `actions` acompanhar a aba aberta (no original, o JS do hook). */
  onChange?: (index: number) => void;
}) {
  const [current, setCurrent] = useState(initialTab);
  const list = useRef<HTMLDivElement>(null);
  const marker = useRef<HTMLDivElement>(null);
  useMarker(
    marker,
    () => list.current?.querySelector<HTMLElement>(`#${CSS.escape(`${id}-tab-${current}`)}`),
    (el, m) => {
      m.style.width = `${el.offsetWidth}px`;
      m.style.left = `${el.offsetLeft}px`;
    },
    [current, id],
  );

  return (
    <div id={id} className="relative">
      <div className={cx("flex items-center justify-between", className)}>
        <div ref={list} className="relative text-neutral-900 p-2 rounded-xl bg-brand-purple-dark/5 inline-flex gap-2 overflow-auto thin-scrollbar">
          <div
            ref={marker}
            className={cx(
              "absolute left-0 duration-300 ease-out pointer-events-none hidden",
              size === "normal" && "h-12",
              size === "small" && "h-10",
            )}
            data-button-tab-marker
          >
            <div className="w-full h-full bg-brand-blue/30 rounded-lg shadow-top-inset text-brand-blue/40"></div>
          </div>

          {tab.map((t, index) => (
            <button
              key={index}
              id={`${id}-tab-${index}`}
              type="button"
              data-active={index === current ? "true" : "false"}
              className={cx(
                "relative text-lg font-bold transition-all rounded-md cursor-pointer whitespace-nowrap",
                "text-brand-purple-dark/60",
                "[&[data-active=true]_>_[data-tab-error]]:text-white",
                "disabled:cursor-not-allowed disabled:text-neutral-300",
                size === "normal" && "px-4 py-2.5 text-lg",
                size === "small" && "px-2 py-1.5 text-base",
              )}
              disabled={t.disabled}
              data-button-tab-button={id}
              data-slug={titleToSlug(t.title)}
              onClick={() => {
                setCurrent(index);
                onChange?.(index);
              }}
            >
              {t.title}
              <span className="hidden">
                <Icon name="fa-warning text-neutral-600 mr-2" type="solid" />
              </span>
            </button>
          ))}
        </div>

        {actions}
      </div>

      <div className="relative w-full mt-4 content">
        {tab.map((t, index) => (
          <div key={index} id={`${id}-tab-${index}-content`} className={cx("relative", index !== current && "hidden")} data-button-tab-content={id}>
            {t.content}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* dropdown_tabs_components.ex                                         */
/* ------------------------------------------------------------------ */

export type DropdownTabSlot = { title: string; parentId: string; noCard?: boolean; content: ReactNode };

export function DropdownTabs({
  id,
  headers,
  header,
  tab,
}: {
  id: string;
  /** `[{id, title}]` do original: a lista de `{id, title}` das abas de topo. */
  headers: [string, string][];
  header?: ReactNode;
  tab: DropdownTabSlot[];
}) {
  const [current, setCurrent] = useState<{ tabId: string; title: string } | null>(null);
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [menuPosition, setMenuPosition] = useState({ left: 0, top: 0 });
  const root = useRef<HTMLDivElement>(null);
  const marker = useRef<HTMLDivElement>(null);
  const byParent = tab.reduce<Record<string, string[]>>((acc, t) => {
    acc[t.parentId] = [...(acc[t.parentId] ?? []), t.title];
    return acc;
  }, {});
  const activeTitle = current?.title ?? tab[0]?.title;

  useMarker(
    marker,
    () =>
      current
        ? root.current?.querySelector<HTMLElement>(`[data-dropdown-button="${CSS.escape(current.tabId)}"]`)
        : root.current?.querySelector<HTMLElement>("[data-dropdown-button]"),
    (el, m) => {
      m.style.width = `${el.offsetWidth}px`;
      m.style.height = `${el.offsetHeight}px`;
      m.style.left = `${(el.offsetParent as HTMLElement | null)?.offsetLeft ?? 0}px`;
    },
    [current?.tabId, current?.title],
  );

  useEffect(() => {
    if (!openMenu) return;
    const close = (event: MouseEvent) => {
      const target = event.target as Element;
      if (!target.closest("[data-dropdown-button]") && !target.closest("[data-dropdown-content]")) setOpenMenu(null);
    };
    const scroller = root.current?.querySelector(".overflow-x-auto");
    const onScroll = () => setOpenMenu(null);
    document.addEventListener("click", close);
    scroller?.addEventListener("scroll", onScroll);
    return () => {
      document.removeEventListener("click", close);
      scroller?.removeEventListener("scroll", onScroll);
    };
  }, [openMenu]);

  const select = (tabId: string, title: string) => {
    setCurrent({ tabId, title });
    setOpenMenu(null);
  };

  return (
    <div id={id} ref={root} className="relative w-full">
      <Card className="mb-6 !p-0">
        <div className="p-6">{header}</div>
        <div className="relative flex gap-4 px-6 border-t border-brand-purple-dark/10 text-gray-500 overflow-x-auto thin-scrollbar">
          {headers.map(([headerId, label], headerIndex) => {
            const tabs = byParent[headerId] ?? [];
            if (tabs.length === 0) return null;
            return (
              <div key={headerId} className="relative">
                <button
                  type="button"
                  data-dropdown-button={headerId}
                  data-active={current ? String(current.tabId === headerId) : undefined}
                  onClick={(event) => {
                    if (tabs.length === 1) {
                      select(headerId, tabs[0]!);
                      return;
                    }
                    event.stopPropagation();
                    const rect = event.currentTarget.getBoundingClientRect();
                    setMenuPosition({ left: rect.left, top: rect.bottom + 8 });
                    setOpenMenu(openMenu === headerId ? null : headerId);
                  }}
                  className="relative flex items-center gap-2 py-4 font-bold text-brand-purple-dark/50 whitespace-nowrap cursor-pointer"
                >
                  {label}
                  {tabs.length > 1 && <Icon name="fa-chevron-down" className="w-4 h-4" />}
                </button>

                {tabs.length > 1 && (
                  <div
                    data-dropdown-content={headerId}
                    style={{ left: `${menuPosition.left}px`, top: `${menuPosition.top}px` }}
                    className={cx(
                      "fixed z-[99] mt-2 shadow-md border border-brand-purple-dark/10 transition duration-200",
                      "min-w-52 max-w-72 bg-white rounded-2xl truncate p-4",
                      openMenu === headerId ? "ease-out opacity-100 translate-y-0" : "hidden opacity-0 -translate-y-2",
                    )}
                  >
                    <ul>
                      {tabs.map((title, index) => {
                        const active = current
                          ? current.tabId === headerId && current.title === title
                          : headerIndex === 0 && index === 0;
                        return (
                          <li
                            key={title}
                            onClick={() => select(headerId, title)}
                            data-tab-option
                            data-tab-id={headerId}
                            data-title={title}
                            data-active={active ? "true" : "false"}
                            className={cx(
                              "font-bold px-4 py-2 cursor-pointer transition-colors",
                              "hover:bg-brand-purple-dark/5 text-brand-purple-dark/60",
                              "relative rounded-lg",
                              "data-[active=true]:bg-brand-purple/10",
                              "data-[active=true]:pr-12",
                              "[&[data-active=false]_[data-icon]]:hidden",
                              "[&[data-active=true]_[data-icon]]:inline-block",
                            )}
                          >
                            {title}

                            <span data-icon>
                              <Icon name="fa-check" className="absolute right-4 top-3 w-4 h-4" />
                            </span>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                )}
              </div>
            );
          })}

          <div ref={marker} className="absolute left-0 w-1/2 h-full duration-300 ease-out pointer-events-none hidden" data-tab-marker>
            <div className="w-full h-full border-b-4 border-blue"></div>
          </div>
        </div>
      </Card>

      {tab.map((t, index) => (
        <div key={index} id={`${id}-tab-${index}-content`} className={cx("relative", t.title !== activeTitle && "hidden")} data-tab-content={t.title}>
          {t.noCard ? t.content : <Card>{t.content}</Card>}
        </div>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* lazy_tab_component.ex                                               */
/* ------------------------------------------------------------------ */

type Maybe<T> = T | false | null | undefined;

/** Uma aba. Sem `component`, a aba fica desabilitada, como no original. */
export type LazyTab = {
  id: string;
  title: string;
  mobileTitle?: string;
  component?: ReactNode | (() => ReactNode);
  opts?: { card?: boolean };
};

/** Um grupo, que vira `dropdown/1` com as abas dentro. */
export type LazyTabGroup = { title: string; tabs: Maybe<LazyTab>[] };

export type LazyTabEntry = LazyTab | LazyTabGroup;

const isGroup = (entry: LazyTabEntry): entry is LazyTabGroup => "tabs" in entry;
const present = <T,>(value: Maybe<T>): value is T => Boolean(value);

const lazyTabButtonClasses = [
  "relative font-bold transition-all rounded-md cursor-pointer whitespace-nowrap py-4",
  "data-[active=true]:text-blue-dark text-neutral-400",
  "data-[disabled]:opacity-50 data-[disabled]:cursor-not-allowed",
];

export function LazyTabs({
  id,
  tabs,
  opts,
  activeTab,
  header,
}: {
  id: string;
  tabs: Maybe<LazyTabEntry>[];
  opts?: { card?: boolean };
  activeTab?: string;
  header?: ReactNode;
}) {
  const entries = tabs.filter(present).map((entry) => (isGroup(entry) ? { ...entry, tabs: entry.tabs.filter(present) } : entry));
  const flatTabs = entries.flatMap((entry) => (isGroup(entry) ? (entry.tabs as LazyTab[]) : [entry]));
  const [active, setActive] = useState<string | undefined>(activeTab ?? flatTabs[0]?.id);
  const [mounted, setMounted] = useState<Set<string>>(() => new Set(active ? [active] : []));
  const nav = useRef<HTMLDivElement>(null);
  const marker = useRef<HTMLDivElement>(null);

  useMarker(
    marker,
    () => nav.current?.querySelector<HTMLElement>(`[data-tab-button="${CSS.escape(active ?? "")}"]`)?.closest<HTMLElement>("[data-buttom-marker]"),
    lineMarker,
    [active],
  );

  const select = (tab: LazyTab) => {
    if (!tab.component) return;
    setActive(tab.id);
    setMounted((current) => new Set(current).add(tab.id));
  };

  const matches = (list: LazyTab[]) => (active ? list.some((tab) => tab.id === active) : false);

  return (
    <div id={id}>
      <Card className="mb-6 p-0!">
        <div className="group p-6" data-tab-header>
          {header}
        </div>

        <div
          ref={nav}
          data-selected-tab={active}
          className="relative w-full text-gray-500 select-none flex gap-4 border-t border-brand-purple-dark/10 overflow-y-hidden overflow-x-auto thin-scrollbar pb-1 px-6"
        >
          {entries.map((entry, index) =>
            isGroup(entry) ? (
              <div key={index} data-buttom-marker>
                <Dropdown
                  id="details_dropdown"
                  placement="bottom"
                  items={
                    <div className="space-y-1 p-2">
                      {(entry.tabs as LazyTab[]).map((tab) => (
                        <button
                          key={tab.id}
                          className={cx(
                            "block w-full text-left",
                            "font-bold px-4 py-2 cursor-pointer transition-colors hover:bg-brand-purple-dark/5 text-brand-purple-dark/60 relative rounded-lg",
                            active === tab.id ? "bg-brand-purple/10 pr-12 [&>[data-icon]]:inline-block" : "[&>[data-icon]]:hidden",
                          )}
                          onClick={() => select(tab)}
                          data-tab-button={tab.id}
                        >
                          {tab.title}

                          <span data-icon>
                            <Icon name="fa-check" className="absolute right-4 top-3 w-4 h-4" />
                          </span>
                        </button>
                      ))}
                    </div>
                  }
                >
                  <div
                    data-tab-matcher={(entry.tabs as LazyTab[]).map((tab) => tab.id).join(",")}
                    data-active={matches(entry.tabs as LazyTab[]) ? "true" : "false"}
                    data-disabled={entry.tabs.length === 0 ? "" : undefined}
                    className={cx(lazyTabButtonClasses)}
                  >
                    {entry.title}{" "}
                    <Icon name="fa-chevron-down" />
                  </div>
                </Dropdown>
              </div>
            ) : (
              <button
                key={index}
                type="button"
                onClick={() => select(entry)}
                className={cx(lazyTabButtonClasses)}
                data-disabled={entry.component ? undefined : ""}
                data-tab-button={entry.id}
                data-buttom-marker
                data-tab-matcher={entry.id}
                data-active={active === entry.id ? "true" : "false"}
              >
                <span className={entry.mobileTitle ? "hidden md:inline" : undefined}>{entry.title}</span>
                <span className={entry.mobileTitle ? "inline md:hidden" : undefined}>{entry.mobileTitle}</span>
              </button>
            ),
          )}

          <div ref={marker} id={`${id}-tab-marker`} className="absolute left-0 w-1/2 h-full duration-300 ease-out pointer-events-none hidden" data-tab-marker>
            <div className="w-full h-full border-b-4 border-blue"></div>
          </div>
        </div>
      </Card>

      <div className="tab-content">
        {flatTabs.map((tab) => {
          const card = tab.opts?.card ?? opts?.card ?? true;
          const body = mounted.has(tab.id) && tab.component ? (typeof tab.component === "function" ? tab.component() : tab.component) : null;
          return (
            <div key={tab.id} data-tab-content={tab.id} hidden={tab.id !== active}>
              {card ? <Card>{body}</Card> : <div>{body}</div>}
            </div>
          );
        })}
      </div>
    </div>
  );
}
