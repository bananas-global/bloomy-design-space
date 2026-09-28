import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { Icon } from "./Icon.js";
import { Card } from "./Card.js";

export type ButtonTab<T extends string> = {
  id: T;
  label: string;
  disabled?: boolean;
  /**
   * Ícone antes do rótulo. **Não existe em `button_tabs/1`** — ver decisão 0015.
   */
  icon?: string;
  /**
   * Contador depois do rótulo. Também extensão: o original não tem badge.
   * Zero não renderiza — um contador de pendência que mostra "0" convida a
   * abrir a aba que não tem trabalho.
   */
  badge?: number;
};

/**
 * `button_tabs/1` — o trilho de abas com marcador móvel do sistema.
 *
 * A implementação original mede a largura e o deslocamento do botão ativo e
 * move um marcador absoluto por baixo dele. Preservar o marcador separado é o
 * que mantém a transição fluida mesmo quando os rótulos têm larguras diferentes.
 *
 * **Três extensões sobre o original**, registradas na decisão 0015:
 *
 * 1. `icon` e `badge` por aba. O HEEx renderiza só o rótulo.
 * 2. `header`, que o `wrapper` não tem e o `lazy_tabs/1` tem. Sem ele, o título
 *    da página e o trilho ficariam em linhas diferentes e o `justify-between`
 *    do original empurraria as abas para a esquerda do cartão.
 * 3. `actions`, que o original **tem** (`slot :actions`) e este porte não
 *    tinha. Voltou junto porque é onde o botão de ação da página mora.
 */
export function ButtonTabs<T extends string>({
  id,
  label,
  tabs,
  value,
  onChange,
  children,
  header,
  actions,
  size = "small",
  className,
  panelClassName,
}: {
  id: string;
  label: string;
  tabs: ButtonTab<T>[];
  value: T;
  onChange: (value: T) => void;
  children: ReactNode;
  /** Título da página, à esquerda do trilho. Extensão — ver acima. */
  header?: ReactNode;
  /** `slot :actions` do original: o que fica à direita do trilho. */
  actions?: ReactNode;
  size?: "small" | "normal";
  className?: string;
  panelClassName?: string;
}) {
  const tabList = useRef<HTMLDivElement>(null);
  const marker = useRef<HTMLDivElement>(null);
  const panelId = `${id}-panel`;

  useLayoutEffect(() => {
    const list = tabList.current;
    const activeButton = list?.querySelector<HTMLElement>(`[data-button-tab="${value}"]`);
    const activeMarker = marker.current;
    if (!list || !activeButton || !activeMarker) return;

    /* Mede as **quatro** medidas do botão ativo, e não só as duas horizontais.
       A altura era `h-10`/`h-12` fixa no marcador, e só uma delas casava: em
       `normal` o botão dá exatamente 48px, em `small` dá 36 contra os 40 do
       marcador — e no telefone, onde a aba fica só com o ícone e não há texto
       para dar a altura de linha, dá 28. O marcador de 40 sobrava 12px numa
       caixa de 28 e escapava por cima e por baixo do trilho, como uma aba solta
       fora da moldura. Medir resolve em qualquer tamanho e nos dois modos. */
    const reposition = () => {
      activeMarker.style.width = `${activeButton.offsetWidth}px`;
      activeMarker.style.height = `${activeButton.offsetHeight}px`;
      activeMarker.style.left = `${activeButton.offsetLeft}px`;
      activeMarker.style.top = `${activeButton.offsetTop}px`;
      activeMarker.classList.remove("hidden");
    };

    reposition();
    const resizeObserver = new ResizeObserver(reposition);
    resizeObserver.observe(list);
    resizeObserver.observe(activeButton);

    return () => resizeObserver.disconnect();
  }, [value]);

  function moveFocus(event: KeyboardEvent<HTMLDivElement>) {
    if (!(event.key === "ArrowLeft" || event.key === "ArrowRight" || event.key === "Home" || event.key === "End")) return;

    const enabledTabs = tabs.filter((tab) => !tab.disabled);
    const current = enabledTabs.findIndex((tab) => tab.id === value);
    if (current < 0 || enabledTabs.length === 0) return;

    event.preventDefault();
    const next =
      event.key === "Home"
        ? 0
        : event.key === "End"
          ? enabledTabs.length - 1
          : (current + (event.key === "ArrowRight" ? 1 : -1) + enabledTabs.length) % enabledTabs.length;
    const tab = enabledTabs[next];
    if (!tab) return;

    onChange(tab.id);
    tabList.current?.querySelector<HTMLButtonElement>(`[data-button-tab="${tab.id}"]`)?.focus();
  }

  return (
    <div id={id} className={["relative", className].filter(Boolean).join(" ")}>
      <div className="flex flex-wrap items-center justify-between gap-4">
        {header}
        {/* Sem `header`, o grupo ocupa a linha e volta ao `justify-between` do
            original: trilho à esquerda, ações à direita. Com `header`, trilho e
            ações andam juntos no canto direito. */}
        <div
          className={[
            /* `min-w-0`: sem ele este item de flex tem tamanho mínimo igual
               ao conteúdo — e o conteúdo é o trilho inteiro, 431px com quatro
               abas —, e o grupo esticava além do cartão. Com ele o grupo cede,
               e é o `flex-wrap` que joga o trilho para a linha de baixo quando
               ele não cabe ao lado das ações. */
            "flex min-w-0 flex-wrap items-center gap-3",
            header ? undefined : "flex-1 justify-between",
          ]
            .filter(Boolean)
            .join(" ")}
        >
        <div
          ref={tabList}
          className="relative inline-flex gap-2 rounded-xl bg-[var(--color-brand-purple-dark)]/5 p-2 text-[var(--color-brand-purple-dark)]"
          role="tablist"
          aria-label={label}
          onKeyDown={moveFocus}
        >
          <div
            ref={marker}
            aria-hidden="true"
            data-button-tab-marker
            className="pointer-events-none absolute left-0 top-0 hidden text-[var(--color-brand-blue)]/40 transition-[left,top,width,height] duration-300 ease-out"
          >
            <div className="h-full w-full rounded-lg bg-[var(--color-brand-blue)]/30 shadow-[var(--shadow-top-inset)]" />
          </div>

          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              role="tab"
              data-button-tab={tab.id}
              aria-selected={value === tab.id}
              aria-controls={panelId}
              tabIndex={value === tab.id ? 0 : -1}
              disabled={tab.disabled}
              onClick={() => onChange(tab.id)}
              className={[
                /* O rótulo da aba é o navy a **72%**, e não a 60% do original.

                   É a mesma direção da decisão 0001, e o mesmo movimento que a
                   variante `brand` do `tag/1` já tinha feito nesta pasta: o tom
                   é o mesmo, muda a opacidade, e o par sai de reprovado para
                   aprovado sem que a aba mude de aparência para quem enxerga.

                   A 60% o rótulo dava 3,57:1 sobre o marcador azul da aba ativa
                   e 3,87:1 sobre o trilho — reprova AA, e não é texto grande:
                   16px em negrito. A 72% são 4,95:1 e 5,56:1, e este último é o
                   par já declarado em `src/tokens/contrast.ts` como "rótulo de
                   ação indisponível", medido sobre o mesmo cinza.

                   Sem isto, a única saída era marcar o `ButtonTabs` inteiro como
                   `espelho-do-sistema` — e como ele envolve o painel, a varredura
                   perderia junto todo o conteúdo das abas. Ver decisão 0018. */
                "relative inline-flex cursor-pointer items-center gap-2 whitespace-nowrap rounded-md font-bold text-[var(--color-brand-purple-dark)]/72 transition-colors",
                "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-action)]",
                "disabled:cursor-not-allowed disabled:text-[var(--color-neutral-300)]",
                size === "normal" ? "px-4 py-2.5 text-lg" : "px-2 py-1.5 text-base",
                /* Sem rótulo, o botão é **quadrado**, e o lado é a altura que
                   ele tem com rótulo: 36px em `small`, 48px em `normal`. Com o
                   recuo horizontal e nada mais, a largura passava a ser a do
                   glifo — `fa-users` dá 36, `fa-clock` dá 32 —, e três abas em
                   sequência ficavam de tamanhos diferentes.

                   `justify-center` porque o quadrado é mais largo que o ícone,
                   e `px-0 py-0` porque o lado agora vem de `size-*`; são as
                   mesmas propriedades do recuo acima, e variante vem depois de
                   utilitário puro na folha, então sobrescrevem. */
                tab.icon
                  ? size === "normal"
                    ? "@max-phone:size-12 @max-phone:justify-center @max-phone:px-0 @max-phone:py-0"
                    : "@max-phone:size-9 @max-phone:justify-center @max-phone:px-0 @max-phone:py-0"
                  : undefined,
              ]
                .filter(Boolean)
                .join(" ")}
            >
              {tab.icon && <Icon name={tab.icon} />}
              {/* No telefone a aba fica só com o ícone; de `@phone` para cima
                  mostra o rótulo.

                  Com quatro abas e rótulo, o trilho pede 431px — mais que a
                  largura útil de um telefone. Como o trilho não rola (ver
                  acima), rótulo em telefone transbordaria o cartão.

                  A regra é `@max-phone:sr-only`, e não `sr-only` com
                  `@phone:not-sr-only`: `not-sr-only` dentro de variante de
                  container não gera CSS nenhum no Tailwind 4 — era o que fazia
                  o rótulo desaparecer em **toda** largura, inclusive no
                  desktop. Esconder no caso estreito é uma regra só, e o caso
                  largo é o padrão sem variante.

                  `sr-only` e não `hidden`: o rótulo continua no DOM e continua
                  sendo o nome acessível da aba. Uma aba que anuncia só o ícone
                  não anuncia nada — `Icon` é `aria-hidden`.

                  Só vale quando a aba tem ícone. Sem ele não há o que sobrar, e
                  o espelho puro de `button_tabs/1` — que não tem ícone nenhum —
                  continua mostrando o rótulo em qualquer largura. */}
              <span data-tab-label className={tab.icon ? "@max-phone:sr-only" : undefined}>
                {tab.label}
              </span>
              {tab.badge !== undefined && tab.badge > 0 && (
                /* No telefone o contador sai da linha e vira canto.

                   Inline ele é o que impedia o quadrado: a aba com contador
                   media 65px contra 36 e 32 das vizinhas. Sumir com ele custaria
                   a informação — a Documentação do profissional é a única tela
                   onde esse número aparece —, então ele vira sobreposição de
                   canto, que é o tratamento que o sistema já dá ao contador de
                   botão: `notification_badge` do `button/1` é `absolute -left-1
                   -top-1` no sino do cabeçalho. Aqui é à direita porque a
                   esquerda de uma aba encosta na vizinha.

                   `-top-1` e `-right-1` ficam dentro do `p-2` do trilho, e o
                   trilho não recorta mais nada — outra coisa que só é possível
                   depois de tirar o `overflow-auto`. */
                <span
                  className={[
                    "rounded-full bg-[var(--color-red-light)] px-2 text-xs font-bold text-[var(--color-danger-fg)]",
                    tab.icon
                      ? "@max-phone:absolute @max-phone:-right-1 @max-phone:-top-1 @max-phone:px-1.5 @max-phone:leading-4"
                      : undefined,
                  ]
                    .filter(Boolean)
                    .join(" ")}
                >
                  {tab.badge}
                </span>
              )}
            </button>
          ))}
        </div>

          {actions}
        </div>
      </div>

      <div id={panelId} role="tabpanel" className={["relative mt-4 w-full", panelClassName].filter(Boolean).join(" ")}>
        {children}
      </div>
    </div>
  );
}

export type LazyTab<T extends string> = {
  id: T;
  label: string;
  disabled?: boolean;
};

export type LazyTabGroup<T extends string> = {
  id: string;
  label: string;
  tabs: LazyTab<T>[];
  disabled?: boolean;
};

export type LazyTabEntry<T extends string> = LazyTab<T> | LazyTabGroup<T>;

function isLazyTabGroup<T extends string>(entry: LazyTabEntry<T>): entry is LazyTabGroup<T> {
  return "tabs" in entry;
}

/**
 * `lazy_tabs/1` — navegação do perfil do paciente, com abas agrupadas em menus.
 *
 * O componente original monta o conteúdo de uma opção somente depois da
 * primeira seleção e ancora o menu com Floating UI. Nesta versão, o conteúdo
 * ativo pode ser uma função para manter essa avaliação sob demanda; o menu usa
 * posição fixa e acompanha o gatilho ao redimensionar ou rolar a página.
 *
 * Origem: `lib/bloomy_web/components/lazy_tab_component.ex:28-258`.
 */
export function LazyTabs<T extends string>({
  id,
  label,
  tabs,
  value,
  onChange,
  children,
  header,
  className,
  panelClassName,
}: {
  id: string;
  label: string;
  tabs: LazyTabEntry<T>[];
  value: T;
  onChange: (value: T) => void;
  children: ReactNode | ((value: T) => ReactNode);
  header?: ReactNode;
  className?: string;
  panelClassName?: string;
}) {
  const navigation = useRef<HTMLElement>(null);
  const marker = useRef<HTMLDivElement>(null);
  const triggerRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const [openGroup, setOpenGroup] = useState<string | null>(null);
  const [menuPosition, setMenuPosition] = useState({ left: 0, top: 0 });
  const [mountedTabs, setMountedTabs] = useState<Set<T>>(() => new Set([value]));
  const activeEntry = tabs.find((entry) =>
    isLazyTabGroup(entry) ? entry.tabs.some((tab) => tab.id === value) : entry.id === value,
  );
  const activeGroup = openGroup
    ? tabs.find((entry): entry is LazyTabGroup<T> => isLazyTabGroup(entry) && entry.id === openGroup)
    : undefined;

  useLayoutEffect(() => {
    const nav = navigation.current;
    const activeTop = nav?.querySelector<HTMLElement>("[data-lazy-tab-top][data-active='true']");
    const activeMarker = marker.current;
    if (!nav || !activeTop || !activeMarker) return;

    const reposition = () => {
      activeMarker.style.width = `${activeTop.offsetWidth}px`;
      activeMarker.style.height = `${activeTop.offsetHeight + 4}px`;
      activeMarker.style.left = `${activeTop.offsetLeft}px`;
      activeMarker.classList.remove("hidden");
    };

    reposition();
    const observer = new ResizeObserver(reposition);
    observer.observe(nav);
    observer.observe(activeTop);
    return () => observer.disconnect();
  }, [tabs, value]);

  useEffect(() => {
    setMountedTabs((current) => {
      if (current.has(value)) return current;
      const next = new Set(current);
      next.add(value);
      return next;
    });
  }, [value]);

  useEffect(() => {
    if (!openGroup) return;
    const trigger = triggerRefs.current[openGroup];
    if (!trigger) return;

    const reposition = () => {
      const rect = trigger.getBoundingClientRect();
      const menuWidth = 224;
      const left = Math.min(rect.left, window.innerWidth - menuWidth - 8);
      setMenuPosition({ left: Math.max(8, left), top: rect.bottom + 4 });
    };
    const closeOutside = (event: PointerEvent) => {
      const target = event.target as Node;
      const menu = document.getElementById(`${id}-menu-${openGroup}`);
      if (!trigger.contains(target) && !menu?.contains(target)) setOpenGroup(null);
    };

    reposition();
    window.addEventListener("resize", reposition);
    window.addEventListener("scroll", reposition, true);
    document.addEventListener("pointerdown", closeOutside);
    return () => {
      window.removeEventListener("resize", reposition);
      window.removeEventListener("scroll", reposition, true);
      document.removeEventListener("pointerdown", closeOutside);
    };
  }, [id, openGroup]);

  function topKeyboard(event: KeyboardEvent<HTMLButtonElement>, entry: LazyTabEntry<T>) {
    const buttons = Array.from(
      navigation.current?.querySelectorAll<HTMLButtonElement>("[data-lazy-tab-trigger]:not(:disabled)") ?? [],
    );

    if (event.key === "ArrowLeft" || event.key === "ArrowRight" || event.key === "Home" || event.key === "End") {
      event.preventDefault();
      const current = buttons.indexOf(event.currentTarget);
      const next =
        event.key === "Home"
          ? 0
          : event.key === "End"
            ? buttons.length - 1
            : (current + (event.key === "ArrowRight" ? 1 : -1) + buttons.length) % buttons.length;
      buttons[next]?.focus();
      return;
    }

    if (isLazyTabGroup(entry) && event.key === "ArrowDown") {
      event.preventDefault();
      setOpenGroup(entry.id);
      requestAnimationFrame(() =>
        document.querySelector<HTMLButtonElement>(`#${CSS.escape(id)}-menu-${CSS.escape(entry.id)} [role='menuitemradio']`)?.focus(),
      );
    }

    if (event.key === "Escape") setOpenGroup(null);
  }

  function menuKeyboard(event: KeyboardEvent<HTMLElement>, group: LazyTabGroup<T>) {
    const items = Array.from(event.currentTarget.querySelectorAll<HTMLButtonElement>("[role='menuitemradio']:not(:disabled)"));
    const current = items.indexOf(document.activeElement as HTMLButtonElement);

    if (event.key === "Escape") {
      event.preventDefault();
      setOpenGroup(null);
      triggerRefs.current[group.id]?.focus();
      return;
    }

    if (event.key === "ArrowDown" || event.key === "ArrowUp" || event.key === "Home" || event.key === "End") {
      event.preventDefault();
      const next =
        event.key === "Home"
          ? 0
          : event.key === "End"
            ? items.length - 1
            : (current + (event.key === "ArrowDown" ? 1 : -1) + items.length) % items.length;
      items[next]?.focus();
    }
  }

  function select(tab: LazyTab<T>) {
    if (tab.disabled) return;
    onChange(tab.id);
    setOpenGroup(null);
  }

  const topButtonClasses = [
    "relative cursor-pointer whitespace-nowrap rounded-md py-4 font-bold transition-colors",
    "text-[var(--color-neutral-400)] data-[active=true]:text-[var(--color-brand-blue-dark)]",
    "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-action)]",
    "disabled:cursor-not-allowed disabled:opacity-50",
  ].join(" ");

  const activeTabLabel = activeEntry
    ? isLazyTabGroup(activeEntry)
      ? activeEntry.tabs.find((tab) => tab.id === value)?.label
      : activeEntry.label
    : undefined;

  const menu = activeGroup && typeof document !== "undefined"
    ? createPortal(
        <div
          id={`${id}-menu-${activeGroup.id}`}
          onKeyDown={(event) => menuKeyboard(event, activeGroup)}
          className="fixed z-[9999] min-w-56"
          style={menuPosition}
        >
          <div className="mt-1 min-w-56 rounded-md border border-[var(--color-neutral-200)]/70 bg-white p-1 text-[var(--color-neutral-900)] shadow-md">
            <div className="space-y-1 p-2" role="menu" aria-label={activeGroup.label}>
              {activeGroup.tabs.map((tab) => {
                const selected = tab.id === value;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    role="menuitemradio"
                    aria-checked={selected}
                    disabled={tab.disabled}
                    onClick={() => select(tab)}
                    className={[
                      "relative block w-full cursor-pointer rounded-lg px-4 py-2 text-left font-bold text-[var(--color-brand-purple-dark)]/60 transition-colors",
                      "hover:bg-[var(--color-brand-purple-dark)]/5 focus-visible:outline-2 focus-visible:outline-[var(--color-action)]",
                      "disabled:cursor-not-allowed disabled:opacity-50",
                      selected ? "bg-[var(--color-brand-purple)]/10 pr-12" : "",
                    ].join(" ")}
                  >
                    {tab.label}
                    {selected && (
                      <Icon
                        name="fa-check"
                        className="absolute right-4 top-3 h-4 w-4 text-[var(--color-brand-purple)]"
                      />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>,
        document.body,
      )
    : null;

  return (
    <div id={id} className={className} data-lazy-tabs>
      <Card className="mb-6 overflow-visible p-0!">
        {header !== undefined && <div className="group p-6" data-tab-header>{header}</div>}
        <nav
          ref={navigation}
          aria-label={label}
          className={[
            "thin-scrollbar relative flex w-full select-none gap-4 overflow-x-auto overflow-y-hidden px-6 pb-1 text-[var(--color-neutral-500)]",
            header !== undefined ? "border-t border-[var(--color-brand-purple-dark)]/10" : "",
          ].join(" ")}
        >
          {tabs.map((entry) => {
            const entryActive = activeEntry === entry;
            const disabled = entry.disabled || (isLazyTabGroup(entry) && entry.tabs.every((tab) => tab.disabled));

            if (isLazyTabGroup(entry)) {
              const open = openGroup === entry.id;
              return (
                <div key={entry.id} data-lazy-tab-top data-active={entryActive}>
                  <button
                    ref={(node) => { triggerRefs.current[entry.id] = node; }}
                    type="button"
                    data-lazy-tab-trigger={entry.id}
                    data-management-group={entry.id}
                    data-active={entryActive}
                    aria-haspopup="menu"
                    aria-expanded={open}
                    aria-current={entryActive ? "page" : undefined}
                    disabled={disabled}
                    onClick={() => setOpenGroup(open ? null : entry.id)}
                    onKeyDown={(event) => topKeyboard(event, entry)}
                    className={topButtonClasses}
                  >
                    {entry.label} <Icon name="fa-chevron-down" />
                  </button>
                </div>
              );
            }

            return (
              <button
                key={entry.id}
                type="button"
                data-lazy-tab-top
                data-lazy-tab-trigger={entry.id}
                data-active={entryActive}
                aria-current={entryActive ? "page" : undefined}
                disabled={disabled}
                onClick={() => select(entry)}
                onKeyDown={(event) => topKeyboard(event, entry)}
                className={topButtonClasses}
              >
                {entry.label}
              </button>
            );
          })}

          <div
            ref={marker}
            aria-hidden="true"
            data-lazy-tab-marker
            className="pointer-events-none absolute left-0 top-0 hidden h-full duration-300 ease-out"
          >
            <div className="h-full w-full border-b-4 border-[var(--color-brand-blue)]" />
          </div>
        </nav>
      </Card>

      <div className={["tab-content", panelClassName].filter(Boolean).join(" ")}>
        {typeof children === "function"
          ? Array.from(new Set(mountedTabs).add(value)).map((tabId) => {
              const entry = tabs.find((candidate) =>
                isLazyTabGroup(candidate)
                  ? candidate.tabs.some((tab) => tab.id === tabId)
                  : candidate.id === tabId,
              );
              const tabLabel = entry
                ? isLazyTabGroup(entry)
                  ? entry.tabs.find((tab) => tab.id === tabId)?.label
                  : entry.label
                : undefined;
              return (
                <section key={tabId} role="tabpanel" aria-label={tabLabel} hidden={tabId !== value}>
                  {children(tabId)}
                </section>
              );
            })
          : <section role="tabpanel" aria-label={activeTabLabel}>{children}</section>}
      </div>
      {menu}
    </div>
  );
}
