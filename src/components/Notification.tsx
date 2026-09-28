import { useEffect, useRef, useState } from "react";
import { Icon } from "./Icon.js";

/**
 * `notification_component.ex` → `BloomyWeb.NotificationComponent` (o sino do
 * cabeçalho). É um LiveView com stream e PubSub; aqui a lista chega por prop e o
 * "marcar como lido" é estado local. O `DropdownHook` vira estado React.
 */

export type UserNotification = {
  id: string;
  title: string;
  content: string;
  /** `relative_from_now(inserted_at)`, já formatado: "há 2 horas". */
  insertedAt: string;
  /** `read_at` formatado (`%d/%m/%Y %H:%m`); ausente quando não lida. */
  readAt?: string;
  onClickUrl?: string;
};

function NotificationBadge({ count }: { count: number }) {
  return (
    <p
      className={[
        "absolute inline-flex items-center justify-center -top-2 -right-2",
        "w-6 h-6 rounded-lg",
        "text-xs font-bold text-white",
        "bg-purple border-2 border-white",
      ].join(" ")}
    >
      {count}
    </p>
  );
}

export function NotificationComponent({
  notifications = [],
  unreadCount,
  onNavigate,
}: {
  notifications?: UserNotification[];
  /** Padrão: as não lidas de `notifications`. */
  unreadCount?: number;
  onNavigate?: (to: string) => void;
}) {
  const [items, setItems] = useState(notifications);
  const [count, setCount] = useState(unreadCount ?? notifications.filter((n) => !n.readAt).length);
  const [open, setOpen] = useState(false);
  const [shown, setShown] = useState(false);
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) {
      const timer = window.setTimeout(() => setShown(true), 10);
      return () => window.clearTimeout(timer);
    }
    setShown(false);
  }, [open]);

  useEffect(() => {
    const away = (event: MouseEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("click", away);
    return () => document.removeEventListener("click", away);
  }, []);

  const markAll = () => {
    setItems((current) => current.map((n) => ({ ...n, readAt: n.readAt ?? "agora" })));
    setCount(0);
  };

  const markOne = (id: string) => {
    setItems((current) => current.map((n) => (n.id === id ? { ...n, readAt: "agora" } : n)));
    setCount((c) => c - 1);
  };

  return (
    <div id="notification_wrapper" ref={root} className="relative">
      <button data-dropdown-button onClick={() => setOpen((o) => !o)}>
        <div className="relative flex items-center justify-center w-10 h-10 rounded-lg bg-orange/20">
          {count > 0 && <NotificationBadge count={count} />}

          <Icon name="fa-bell" className="text-orange" />
        </div>
      </button>

      <div
        data-dropdown-content
        className={[
          "absolute top-0 z-50 w-80 -left-72 md:-left-[22rem] md:w-96 mt-12 px-2",
          open ? "" : "hidden",
          shown ? "transition ease-out duration-200 opacity-100 translate-y-0" : "transition ease-in duration-200 opacity-0 -translate-y-2",
        ].join(" ")}
      >
        <div className="bg-white border rounded-md shadow-md border-neutral-200/70 text-neutral-900">
          <div className="flex items-center justify-between p-4 border-b border-neutral-50">
            <h1 className="text-xl font-semibold text-neutral-800">Notificações</h1>

            <div className="flex items-center gap-1">
              <button
                disabled={!(count > 0)}
                onClick={markAll}
                className="text-xs font-bold hover:bg-neutral-50 px-2 py-1 rounded transition-all duration-200 ease-in-out active:scale-[0.98] "
              >
                Marcar todos como lido
              </button>

              <a
                href="/backoffice/notificacoes"
                onClick={(event) => {
                  event.preventDefault();
                  onNavigate?.("/backoffice/notificacoes");
                }}
                className="flex items-center justify-center w-8 h-8 rounded hover:bg-neutral-50 transition-all"
              >
                <Icon name="fa-arrow-up-right-from-square" />
              </a>
            </div>
          </div>

          {items.length === 0 && <p className="text-center px-4 py-8">Nenhuma notificação encontrada</p>}

          <div id="notifications_container" className="max-h-80 overflow-auto">
            {items.map((notification) => {
              const read = notification.readAt != null;
              return (
                <div
                  key={notification.id}
                  id={`user_notifications-${notification.id}`}
                  onClick={notification.onClickUrl ? () => onNavigate?.(notification.onClickUrl!) : undefined}
                  className={[
                    "p-4 first:border-t-transparent border-t border-t-neutral-50",
                    "hover:bg-neutral-50/30 transition-all cursor-pointer",
                    "flex gap-2",
                  ].join(" ")}
                >
                  <button
                    disabled={read}
                    onClick={() => markOne(notification.id)}
                    title={read ? `Notificação lida em: ${notification.readAt}` : "Marcar como lido"}
                    className={["w-2 h-2 rounded-full flex-shrink-0 mt-2", read ? "bg-neutral-100 hover:bg-neutral-200" : "bg-purple"].join(" ")}
                  />

                  <div>
                    <p className="font-bold text-neutral-800">{notification.title}</p>
                    <p className="text-sm text-neutral-800">{notification.content}</p>
                    <p className="text-sm font-bold text-neutral-800 mt-2">{notification.insertedAt}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
