/**
 * CRM de Leads — o envio de um link por WhatsApp para o responsável e as
 * faixas de entrada e de acompanhamento dos cards que usam isso (Preenchimento
 * pela família, Agenda anterior e Proposta de grade).
 * Novo — não existe no Phoenix: montado sobre `drawer_modal`, `input`, `button` e `tag`.
 */
import { useState, type ReactNode } from "react";
import { Button } from "../../components/Button.js";
import { Icon } from "../../components/Icon.js";
import { Input } from "../../components/Input.js";
import { DrawerModal } from "../../components/Overlay.js";
import { Tag, type TagVariant } from "../../components/Tag.js";
import { TODAY } from "../../components/today.js";
import { fmtBR, type WaSend } from "./model.js";
import { DISABLED, SQUARE_DRAWER, cx } from "./parts.js";

/** Um link fictício para o protótipo: `bloomy.app/<caminho>/<código>`. */
export const fakeLink = (path: string, id: string) => `bloomy.app/${path}/${id.replace(/[^a-z0-9]/gi, "").slice(0, 6)}${Math.random().toString(36).slice(2, 6)}`;

/**
 * O drawer de envio: responsável, WhatsApp, mensagem e a prévia da conversa.
 * `aside` entra à esquerda (a escolha das seções no pedido à família).
 */
export function WhatsDrawer({
  id, show, title, subtitle, guardian, phone, message, link, note, prev, aside, canSend = true, extraActions, onClose, onSend,
}: {
  id: string;
  show: boolean;
  title: string;
  subtitle: string;
  guardian: string;
  phone: string;
  /** A mensagem sugerida. Editada, deixa de acompanhar `message`. */
  message: string;
  link: string;
  note: string;
  prev: WaSend | null;
  aside?: ReactNode;
  canSend?: boolean;
  extraActions?: ReactNode;
  onClose: () => void;
  onSend: (w: WaSend) => void;
}) {
  const [tel, setTel] = useState(phone);
  const [custom, setCustom] = useState<string | null>(null);
  const msg = custom ?? message;
  const ok = canSend && tel.replace(/\D/g, "").length >= 10;
  const form = (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Input id={`${id}-guardian`} label="Responsável" value={guardian || "—"} disabled />
        <Input id={`${id}-phone`} label="WhatsApp" placeholder="(11) 90000-0000" value={tel} onChange={(e) => setTel(e.target.value)} />
      </div>
      <Input id={`${id}-message`} type="textarea" rows={5} label="Mensagem" value={msg} onChange={(e) => setCustom(e.target.value)} />
      <div className="flex flex-col gap-2">
        <p className="m-0 text-xs font-bold uppercase tracking-widest text-brand-purple-dark/60">Prévia</p>
        <div className="max-w-md self-start rounded-xl rounded-tl-sm bg-green/15 px-4 py-3 text-sm text-brand-purple-dark">
          <p className="m-0 whitespace-pre-line">{msg}</p>
          <span className="mt-1 block font-bold text-brand-blue-dark underline">{link}</span>
        </div>
      </div>
      <p className="m-0 flex gap-2 text-[13px] font-semibold text-neutral-500"><Icon name="fa-clock" className="mt-0.5" /><span>{note}</span></p>
    </div>
  );
  return (
    <DrawerModal id={id} className={SQUARE_DRAWER} show={show} title={title} variant={aside ? "large" : "small"} contentClass="flex flex-col" onCancel={onClose}>
      <div className="flex flex-1 flex-col gap-5">
        <p className="m-0 text-sm font-semibold text-brand-purple-dark/70">{subtitle}</p>
        {aside ? <div className="grid grid-cols-1 gap-6 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">{aside}{form}</div> : form}
        <div className="sticky -bottom-6 -mx-6 -mb-6 mt-auto flex flex-wrap items-center justify-between gap-3 border-t border-neutral-100 bg-white px-6 py-4">
          <Button type="button" variant="tint" rightIcon="fa-xmark" onClick={onClose}>Cancelar</Button>
          <div className="flex flex-wrap gap-3">
            {extraActions}
            <Button
              type="button"
              color="green"
              rightIcon="fa-brands fa-whatsapp"
              disabled={!ok}
              className={DISABLED}
              onClick={() => onSend({ to: guardian, phone: tel, link, message: msg, sentAt: TODAY, sends: (prev?.sends ?? 0) + 1 })}
            >
              Enviar
            </Button>
          </div>
        </div>
      </div>
    </DrawerModal>
  );
}

/** A faixa de entrada do card: ícone, o que há registrado e as ações. */
export function Entry({ icon, title, desc, actions }: { icon: string; title: ReactNode; desc: ReactNode; actions?: ReactNode }) {
  return (
    <div className="flex flex-col gap-3 rounded-xl border border-brand-purple-dark/10 p-4">
      <div className="flex items-center gap-3">
        <span className="grid h-10 w-10 flex-none place-items-center rounded-full bg-brand-blue/10 text-brand-blue-dark"><Icon name={icon} type="solid" /></span>
        <div className="min-w-0 flex-1">
          <p className="m-0 font-bold text-brand-purple-dark">{title}</p>
          <p className="m-0 text-sm text-brand-purple-dark/60">{desc}</p>
        </div>
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

/** O acompanhamento de um envio: para quem e quando, a situação e as ações. */
export function SendStatus({ send, label, status, actions, children }: {
  send: WaSend;
  label: string;
  status: [string, TagVariant][];
  actions?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2 rounded-xl bg-neutral-50 px-4 py-3">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-sm text-brand-purple-dark">
        <Icon name="fa-brands fa-whatsapp" className="text-green" />
        <span>{label} <b>{send.to || "responsável"}</b> em {fmtBR(send.sentAt)}{send.sends > 1 ? ` (${send.sends}º envio)` : ""}</span>
        {status.map(([t, v]) => <Tag key={t} item={t} variant={v} pill />)}
        {actions && <span className="ml-auto flex flex-wrap gap-2">{actions}</span>}
      </div>
      {children}
    </div>
  );
}

/** As ações que só existem no protótipo, no lugar da resposta real da família. */
export function SimButton({ children, onClick }: { children: ReactNode; onClick: () => void }) {
  return (
    <Button type="button" size="small" variant="ghost" leftIcon="fa-flask" title="Só no protótipo" className={cx("border border-dashed border-brand-purple-dark/20")} onClick={onClick}>
      {children}
    </Button>
  );
}
