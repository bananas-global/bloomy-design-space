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
export declare function NotificationComponent({ notifications, unreadCount, onNavigate, }: {
    notifications?: UserNotification[];
    /** Padrão: as não lidas de `notifications`. */
    unreadCount?: number;
    onNavigate?: (to: string) => void;
}): import("react").JSX.Element;
