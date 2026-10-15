/**
 * Solicitações de melhoria — "Também me afeta": no lugar do voto, a pessoa diz
 * que o mesmo problema aparece na rotina dela. Entra com a unidade e a área
 * (para o PMO medir a abrangência) e, se quiser, um relato.
 *
 * `button/1`, `drawer_modal/1`, `input/1` e `tag/1`. Quem pediu não se soma à própria
 * SM; encerrada não recebe mais, mas continua visível. PMO e Tech veem o número.
 */
import { useState } from "react";
import { createPortal } from "react-dom";
import { Button } from "../../components/Button.js";
import { Card } from "../../components/Card.js";
import { Icon } from "../../components/Icon.js";
import { Input } from "../../components/Input.js";
import { Header } from "../../components/Layout.js";
import { DrawerModal } from "../../components/Overlay.js";
import { Tag } from "../../components/Tag.js";
import { USERS, affectsMe, compact as compactNumber, isClosed, isMine, plural, reachOf, type Role, type Sm } from "./model.js";
import { Fact, cx } from "./parts.js";
import { sm as actions } from "./store.js";

/** Quem pode dizer "Também me afeta": colaborador, em SM aberta que não é dele. */
export const canAffect = (s: Sm, role: Role) => role === "solicitante" && !isMine(s, role) && !isClosed(s);

/**
 * O botão "Também me afeta", o mesmo nos cards, na lista, no kanban, no detalhe
 * e nas sugestões da Nova solicitação. Marcado, vira "Me afeta"; clicar de novo
 * tira a pessoa. Não aparece para quem pediu, em SM encerrada, nem para PMO e
 * Tech. Os cliques não chegam à linha ou ao cartão em volta.
 */
export function AffectButton({ s, role, size = "medium" }: { s: Sm; role: Role; size?: "small" | "medium" }) {
  const [open, setOpen] = useState(false);
  if (!canAffect(s, role)) return null;
  const me = affectsMe(s, role);

  return (
    <span className="inline-flex" onClick={(e) => e.stopPropagation()}>
      {/* Marcado, fica discreto: o convite é o "Também me afeta"; o "Me afeta" só confirma. */}
      <Button
        type="button"
        variant={me ? "ghost" : "tint"}
        size={size}
        className={cx("whitespace-nowrap", me && "text-brand-blue-dark!")}
        aria-pressed={me}
        title={me ? "Você está entre os afetados. Clique para sair" : "O mesmo problema aparece na sua rotina"}
        leftIcon={me ? "fa-user-check" : "fa-user-plus"}
        iconType="solid"
        onClick={() => (me ? actions.unaffect(s.id, role) : setOpen(true))}
      >
        {me ? "Me afeta" : "Também me afeta"}
      </Button>
      <AffectDrawer s={s} role={role} show={open} onClose={() => setOpen(false)} />
    </span>
  );
}

/** Quantas pessoas são afetadas: só informação, sem ação. */
export function AffectedCount({ s }: { s: Sm }) {
  const n = s.affected.length;
  return (
    <span title={plural(n, "pessoa afetada", "pessoas afetadas")} className="inline-flex items-center gap-1.5 text-sm font-bold text-brand-purple-dark/60">
      <Icon name="fa-users" type="solid" />
      {compactNumber(n)}
    </span>
  );
}

/**
 * "Também me afeta" em `drawer_modal/1`, aberto pela direita. Vai direto para o
 * `body` (portal): dentro de um cartão com `transform` (o kanban sobe no hover),
 * o `fixed` do drawer ficaria preso ao cartão.
 */
function AffectDrawer({ s, role, show, onClose }: { s: Sm; role: Role; show: boolean; onClose: () => void }) {
  const [text, setText] = useState("");
  const me = USERS[role];
  const close = () => {
    setText("");
    onClose();
  };

  return createPortal(
    <DrawerModal
      id={`drawer-afeta-${s.id}`}
      show={show}
      title="Também me afeta"
      variant="extra_small"
      // O conteúdo do drawer vira a moldura: a parte de cima rola, o rodapé fica fixo
      // de borda a borda (o cabeçalho do componente já é fixo).
      contentClass="flex flex-col overflow-hidden! p-0!"
      // Sem o canto arredondado do `drawer_modal/1`: o painel encosta reto na lateral.
      // `className` substitui o do componente, então repete o `relative z-50` dele.
      className="relative z-50 [&_[id$=-container]]:rounded-none!"
      onCancel={close}
    >
      <div className="min-h-0 flex-1 space-y-6 overflow-y-auto p-6">
        <div className="space-y-2">
          <p className="text-sm font-bold text-brand-purple-dark/60">{s.id} · {s.unit}</p>
          <p className="text-lg font-bold leading-snug text-brand-purple-dark">{s.title}</p>
          <p className="text-sm text-brand-purple-dark/70">{s.need}</p>
          <p className="text-xs font-bold text-brand-purple-dark/60">
            <Icon name="fa-users" type="solid" /> Alcança {reachText(s)}
          </p>
        </div>
        <div className="grid grid-cols-2 gap-4 rounded-xl bg-brand-purple-dark/5 p-4">
          <Fact label="Sua unidade">{me.unit}</Fact>
          <Fact label="Sua área">{me.area}</Fact>
          <p className="col-span-2 text-xs text-brand-purple-dark/60">Vão junto com o seu nome para o PMO medir quantas unidades e áreas o problema alcança.</p>
        </div>
        <Input
          type="textarea"
          id={`sm_affect_${s.id}`}
          name="affect_text"
          rows={4}
          label="Como isso aparece no seu dia a dia? (opcional)"
          placeholder="Ex.: Acontece toda semana na minha unidade e remarco os atendimentos na mão."
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
        <p className="text-sm text-brand-purple-dark/60">
          <Icon name="fa-shield-halved" type="solid" /> Não inclua dados de pacientes.
        </p>
      </div>
      <div className="flex shrink-0 justify-end gap-3 border-t border-neutral-100 bg-white px-6 py-4">
        <Button type="button" variant="outline" onClick={close}>Cancelar</Button>
        <Button
          type="button"
          leftIcon="fa-user-plus"
          iconType="solid"
          onClick={() => {
            actions.affect(s.id, role, text.trim());
            close();
          }}
        >
          Também me afeta
        </Button>
      </div>
    </DrawerModal>,
    document.body,
  );
}

/** "Afeta 4 unidades e 3 áreas · 9 pessoas", para os cards e a matriz. */
export function reachText(s: Sm) {
  const r = reachOf(s);
  return `${plural(r.units.length, "unidade", "unidades")} e ${plural(r.areas.length, "área", "áreas")} · ${plural(r.people, "pessoa afetada", "pessoas afetadas")}`;
}

/** O card do detalhe: quem também é afetado, de onde, e os relatos. */
export function AffectedCard({ s, role }: { s: Sm; role: Role }) {
  const [all, setAll] = useState(false);
  const r = reachOf(s);
  const told = s.affected.filter((a) => a.text).slice().reverse();
  const silent = s.affected.length - told.length;
  const shown = all ? told : told.slice(0, 3);

  return (
    <Card className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <Header variant="small">Quem também é afetado</Header>
        <Tag item={String(s.affected.length)} variant="dark-purple" leftIcon="fa-users" />
      </div>

      {s.affected.length === 0 ? (
        <p className="text-sm text-brand-purple-dark/60">Ninguém além de quem pediu, por enquanto.</p>
      ) : (
        <>
          <p className="text-sm font-bold text-brand-purple-dark">
            Alcança {plural(r.units.length, "unidade", "unidades")} e {plural(r.areas.length, "área", "áreas")}
          </p>
          <div className="flex flex-wrap gap-1.5">
            {r.units.map((u) => <Tag key={u} item={u} variant="light-blue" leftIcon="fa-hospital" />)}
          </div>
        </>
      )}

      <AffectButton s={s} role={role} />

      {shown.length > 0 && (
        <ul className="space-y-3 border-t border-brand-purple-dark/10 pt-4">
          {shown.map((a) => (
            <li key={`${a.who}-${a.at}`} className="space-y-1.5">
              <div className="flex flex-wrap justify-between gap-x-2 text-xs font-bold text-brand-purple-dark/60">
                <span>{a.who} · {a.unit}</span>
                <span className="whitespace-nowrap">{a.at.slice(0, 10)}</span>
              </div>
              <p className={cx("rounded-lg px-2.5 py-2 text-sm", a.who === USERS[role].name ? "bg-brand-blue/10" : "bg-brand-purple-dark/5")}>{a.text}</p>
            </li>
          ))}
        </ul>
      )}
      {told.length > 3 && (
        <Button type="button" variant="ghost" size="small" onClick={() => setAll(!all)}>
          {all ? "Mostrar menos" : `Ver os ${told.length} relatos`}
        </Button>
      )}
      {silent > 0 && <p className="text-xs font-bold text-brand-purple-dark/60">+ {plural(silent, "pessoa sem relato", "pessoas sem relato")}</p>}
    </Card>
  );
}
