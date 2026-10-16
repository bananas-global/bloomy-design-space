/**
 * Solicitações de melhoria — plano de ação (RN-011, RN-012, RF-013, RF-014).
 *
 * O que cada um ainda deve à SM, e até quando: abrir a SM não passa a
 * responsabilidade toda para o PMO. O PMO inclui, edita e conclui as ações; o
 * responsável recebe a notificação no sino e pode marcar a dele como em
 * andamento ou concluída. "Vencida" não é status escolhido: aparece quando o
 * prazo passa e a ação não foi concluída. O plano não trava nenhuma etapa.
 *
 * Proposta nova, sem equivalente no Phoenix. Montado com `card/1`, `tag/1`,
 * `button/1`, `input/1` e `drawer_modal/1`.
 */
import { useState } from "react";
import { createPortal } from "react-dom";
import { Button } from "../../components/Button.js";
import { Card } from "../../components/Card.js";
import { Icon } from "../../components/Icon.js";
import { Header } from "../../components/Layout.js";
import { Input } from "../../components/Input.js";
import { DrawerModal } from "../../components/Overlay.js";
import { Tag } from "../../components/Tag.js";
import {
  ACTION_STATUS, L, USERS, isClosed, isOverdue, isoToBR, openActions, opts, overdueActions, plural,
  type ActionStatus, type Role, type Sm, type SmAction,
} from "./model.js";
import { cx } from "./parts.js";
import { sm as actions } from "./store.js";

/** O status da ação e, quando o prazo passou, o destaque de vencida. */
export function ActionTags({ a }: { a: SmAction }) {
  const st = ACTION_STATUS.find((x) => x.v === a.status)!;
  return (
    <span className="flex flex-wrap gap-1.5">
      <Tag item={a.status} variant={st.tag} leftIcon={st.icon} className="whitespace-nowrap" />
      {isOverdue(a) && <Tag item="Vencida" variant="red" leftIcon="fa-clock" className="whitespace-nowrap" />}
    </span>
  );
}

/** Abertas primeiro (as vencidas no topo, depois pelo prazo); as concluídas no fim. */
const byUrgency = (a: SmAction, b: SmAction) =>
  Number(a.status === "Concluída") - Number(b.status === "Concluída") || Number(isOverdue(b)) - Number(isOverdue(a)) || a.due.localeCompare(b.due);

/** O bloco na ficha da SM. Quem não pediu (o colega) não vê: é chamado só para PMO, Tech e quem pediu. */
export function PlanoAcao({ s, role }: { s: Sm; role: Role }) {
  const pmo = role === "pmo";
  const me = USERS[role].name;
  const [editing, setEditing] = useState<SmAction | "new" | null>(null);
  const closed = isClosed(s);
  if (closed && !s.actions.length) return null;
  const open = openActions(s).length;
  const late = overdueActions(s).length;
  const list = [...s.actions].sort(byUrgency);

  return (
    <Card className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <Header variant="small">Plano de ação</Header>
          <p className="text-sm text-brand-purple-dark/60">O que cada um ainda deve fazer nesta SM, e até quando. Não trava o fluxo.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {open > 0 && <Tag item={plural(open, "ação aberta", "ações abertas")} variant="light-blue" />}
          {late > 0 && <Tag item={plural(late, "vencida", "vencidas")} variant="red" leftIcon="fa-clock" />}
          {pmo && !closed && (
            <Button type="button" variant="tint" size="medium" leftIcon="fa-plus" onClick={() => setEditing("new")}>
              Incluir ação
            </Button>
          )}
        </div>
      </div>

      {list.length === 0 ? (
        <p className="rounded-xl bg-brand-purple-dark/5 p-4 text-sm text-brand-purple-dark/60">
          Nenhuma ação no plano ainda.{pmo ? " Inclua o que o solicitante, a área ou a Tech precisa fazer para a SM andar, com responsável e prazo." : ""}
        </p>
      ) : (
        <ul className="divide-y divide-brand-purple-dark/10 overflow-hidden rounded-xl border border-brand-purple-dark/10">
          {list.map((a) => {
            const mine = a.owner === me;
            const late = isOverdue(a);
            return (
              <li key={a.id} className={cx("flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3", late ? "border-l-4 border-l-red bg-red-light/50" : "border-l-4 border-l-transparent")}>
                <div className="min-w-56 flex-1 space-y-1">
                  <p className={cx("font-bold", a.status === "Concluída" ? "text-brand-purple-dark/50 line-through" : "text-brand-purple-dark")}>{a.text}</p>
                  <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-brand-purple-dark/70">
                    <span><Icon name="fa-user" /> {a.owner}{mine && <b className="text-blue-dark"> · você</b>}</span>
                    <span className={late ? "font-bold text-red-dark" : undefined}><Icon name="fa-calendar" /> {isoToBR(a.due)}</span>
                    {a.doneAt && <span>Concluída em {a.doneAt.slice(0, 10)}</span>}
                  </p>
                </div>
                <ActionTags a={a} />
                {!closed && (
                  <div className="flex gap-2">
                    {pmo ? (
                      <Button type="button" variant="ghost" size="small" leftIcon="fa-pen" onClick={() => setEditing(a)}>Editar</Button>
                    ) : (
                      mine && <OwnerButtons s={s} role={role} a={a} />
                    )}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {pmo && <ActionDrawer s={s} role={role} editing={editing} onClose={() => setEditing(null)} />}
    </Card>
  );
}

/** O responsável anda com a própria ação: iniciar e concluir. */
function OwnerButtons({ s, role, a }: { s: Sm; role: Role; a: SmAction }) {
  if (a.status === "Concluída") return null;
  return (
    <>
      {a.status === "Pendente" && (
        <Button type="button" variant="ghost" size="small" onClick={() => actions.setActionStatus(s.id, role, a.id, "Em andamento")}>Iniciar</Button>
      )}
      <Button type="button" variant="tint" color="green" size="small" leftIcon="fa-check" onClick={() => actions.setActionStatus(s.id, role, a.id, "Concluída")}>Concluir</Button>
    </>
  );
}

type Draft = { text: string; owner: string; due: string; status: ActionStatus };

/**
 * Incluir e editar uma ação em `drawer_modal/1`, aberto pela direita, como o
 * "Também me afeta": descrição, responsável e prazo; na edição, o status também.
 * Vai para o `body` (portal), com o rodapé fixo e sem o canto arredondado.
 */
function ActionDrawer({ s, role, editing, onClose }: { s: Sm; role: Role; editing: SmAction | "new" | null; onClose: () => void }) {
  const fresh = (): Draft => (editing && editing !== "new" ? { text: editing.text, owner: editing.owner, due: editing.due, status: editing.status } : { text: "", owner: "", due: "", status: "Pendente" });
  const [draft, setDraft] = useState<Draft>(fresh);
  const [key, setKey] = useState<string | null>(null);
  // Reabre com os dados da ação clicada.
  const current = editing === null ? null : editing === "new" ? "new" : editing.id;
  if (current !== key) {
    setKey(current);
    setDraft(fresh());
  }
  const isNew = editing === "new";
  // Quem pediu primeiro: é o responsável mais comum.
  const people = [s.requester, ...L.staff.filter((n) => n !== s.requester)];
  const missing = !draft.text.trim() || !draft.owner || !draft.due;

  function save() {
    if (missing || !editing) return;
    if (editing === "new") actions.addAction(s.id, role, { text: draft.text.trim(), owner: draft.owner, due: draft.due });
    else actions.editAction(s.id, role, editing.id, { ...draft, text: draft.text.trim() });
    onClose();
  }

  return createPortal(
    <DrawerModal
      id="drawer-acao-sm"
      show={editing !== null}
      title={isNew ? "Incluir ação" : "Editar ação"}
      variant="extra_small"
      // A parte de cima rola e o rodapé fica fixo de borda a borda.
      contentClass="flex flex-col overflow-hidden! p-0!"
      // Sem o canto arredondado: o painel encosta reto na lateral. `className`
      // substitui o do componente, então repete o `relative z-50` dele.
      className="relative z-50 [&_[id$=-container]]:rounded-none!"
      onCancel={onClose}
    >
      <div className="min-h-0 flex-1 space-y-6 overflow-y-auto p-6">
        <div className="space-y-1">
          <p className="text-sm font-bold text-brand-purple-dark/60">{s.id} · {s.unit}</p>
          <p className="text-lg font-bold leading-snug text-brand-purple-dark">{s.title}</p>
        </div>
        <Input type="textarea" id="sm_action_text" rows={2} label="Ação *" placeholder="Ex.: Enviar a planilha de bloqueios do mês." value={draft.text} onChange={(e) => setDraft({ ...draft, text: e.target.value })} />
        <div className="space-y-6">
          <Input type="select" id="sm_action_owner" label="Responsável *" prompt="Selecionar" options={opts(people)} value={draft.owner} onChange={(v) => setDraft({ ...draft, owner: v ?? "" })} />
          <Input type="date" id="sm_action_due" label="Prazo *" value={draft.due} onChange={(e) => setDraft({ ...draft, due: e.target.value })} />
        </div>
        {!isNew && (
          <Input type="select" id="sm_action_status" label="Status" options={opts(ACTION_STATUS.map((x) => x.v))} value={draft.status} clear={false} onChange={(v) => setDraft({ ...draft, status: (v as ActionStatus) ?? "Pendente" })} />
        )}
        <p className="text-sm text-brand-purple-dark/60">
          <Icon name="fa-bell" /> {isNew ? "O responsável recebe uma notificação no sino." : "Trocar o responsável notifica o novo."} Se o prazo vencer sem a ação concluída, o responsável e o PMO são avisados.
        </p>
      </div>
      <div className="flex shrink-0 justify-end gap-3 border-t border-neutral-100 bg-white px-6 py-4">
        <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
        <Button type="button" leftIcon="fa-floppy-disk" disabled={missing} onClick={save}>{isNew ? "Incluir ação" : "Salvar"}</Button>
      </div>
    </DrawerModal>,
    document.body,
  );
}

/**
 * As ações abertas de várias SMs numa lista: as do solicitante na página dele,
 * as da Tech e todas (para o PMO) no painel. Clicar abre a SM.
 */
export function ActionList({ sms, owner, onOpen, empty }: { sms: Sm[]; owner?: string; onOpen: (s: Sm) => void; empty: string }) {
  const rows = sms
    .filter((s) => s.status !== "excluida")
    .flatMap((s) => openActions(s).filter((a) => !owner || a.owner === owner).map((a) => ({ s, a })))
    .sort((x, y) => byUrgency(x.a, y.a));
  if (!rows.length) return <p className="text-sm text-brand-purple-dark/60">{empty}</p>;
  return (
    <ul className="divide-y divide-brand-purple-dark/10">
      {rows.map(({ s, a }) => (
        <li key={`${s.id}-${a.id}`}>
          <button type="button" onClick={() => onOpen(s)} className={cx("flex w-full flex-wrap items-center gap-x-4 gap-y-2 px-2 py-3 text-left hover:bg-brand-purple-dark/5", isOverdue(a) && "bg-red-light/40")}>
            <span className="min-w-56 flex-1">
              <span className="block font-bold text-brand-purple-dark">{a.text}</span>
              <span className="block text-sm text-brand-purple-dark/60">{s.id} · {s.title}{owner ? "" : ` · ${a.owner}`}</span>
            </span>
            <span className={cx("whitespace-nowrap text-sm tabular-nums", isOverdue(a) ? "font-bold text-red-dark" : "text-brand-purple-dark/70")}>
              <Icon name="fa-calendar" /> {isoToBR(a.due)}
            </span>
            <ActionTags a={a} />
            <Icon name="fa-chevron-right" className="text-brand-purple-dark/40" />
          </button>
        </li>
      ))}
    </ul>
  );
}

/** "Suas ações": o que a pessoa deve nas SMs, no acompanhamento dela. Some quando não há nada. */
export function MyActions({ sms, role, onOpen }: { sms: Sm[]; role: Role; onOpen: (s: Sm) => void }) {
  const me = USERS[role].name;
  const mine = sms.flatMap((s) => openActions(s).filter((a) => a.owner === me));
  if (!mine.length) return null;
  const late = mine.filter(isOverdue).length;
  return (
    <Card className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Header variant="small">Suas ações</Header>
          <p className="text-sm text-brand-purple-dark/60">O que o PMO combinou com você nas solicitações, e até quando.</p>
        </div>
        <span className="flex gap-2">
          <Tag item={plural(mine.length, "aberta", "abertas")} variant="light-blue" />
          {late > 0 && <Tag item={plural(late, "vencida", "vencidas")} variant="red" leftIcon="fa-clock" />}
        </span>
      </div>
      <ActionList sms={sms} owner={me} onOpen={onOpen} empty="" />
    </Card>
  );
}
