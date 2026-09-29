FormGrid from bloomy-design-space. Use via `window.Bloomy.FormGrid` (bundle loaded from the root `_ds_bundle.js`).

`data-collapsed` do `aside`: `true` é a barra estreita (e zero no celular). */
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
/* ------------------------------------------------------------------

## Props

```ts
interface FormGridProps {
  className?: string;
  variant?: "small" | "medium";
  children: React.ReactNode;
}
```
