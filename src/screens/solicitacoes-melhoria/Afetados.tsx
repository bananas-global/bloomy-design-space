/**
 * Solicitações de melhoria — "Também me afeta": no lugar do voto, a pessoa diz
 * que o mesmo problema aparece na rotina dela. Entra com a unidade e a área
 * (para o PMO medir a abrangência) e, se quiser, um relato.
 *
 * `button/1`, `modal/1`, `input/1` e `tag/1`. Quem pediu não se soma à própria
 * SM; encerrada não recebe mais, mas continua visível. PMO e Tech veem o número.
 */
import { useState } from "react";
import { Button } from "../../components/Button.js";
import { Card } from "../../components/Card.js";
import { Icon } from "../../components/Icon.js";
import { Input } from "../../components/Input.js";
import { Header } from "../../components/Layout.js";
import { Modal } from "../../components/Overlay.js";
import { Tag } from "../../components/Tag.js";
import { USERS, affectsMe, compact as compactNumber, isClosed, isMine, plural, reachOf, type Role, type Sm } from "./model.js";
import { Fact, cx } from "./parts.js";
import { sm as actions } from "./store.js";

/**
 * O botão "Também me afeta". `compact` é o contador da base dos cards, como a
 * curtida de uma rede social; o padrão é o botão com texto, do detalhe e das
 * sugestões da Nova solicitação.
 */
export function AffectButton({ s, role, compact = false }: { s: Sm; role: Role; compact?: boolean }) {
  const [open, setOpen] = useState(false);
  const n = s.affected.length;
  const mine = isMine(s, role);
  const closed = isClosed(s);
  const me = affectsMe(s, role);

  // PMO e Tech acompanham o número; quem se soma aos afetados é o colaborador.
  const staff = role !== "solicitante";
  if (mine || closed || staff) {
    if (!compact) return null;
    return (
      <span
        title={`${plural(n, "pessoa afetada", "pessoas afetadas")}${staff ? "" : ` · ${mine ? "sua solicitação" : "encerrada, não recebe mais"}`}`}
        className="inline-flex h-8 items-center gap-1.5 px-2 text-sm font-bold text-brand-purple-dark/60"
      >
        <Icon name="fa-users" type="solid" />
        {compactNumber(n)}
      </span>
    );
  }

  const click = () => (me ? actions.unaffect(s.id, role) : setOpen(true));
  const label = me ? "Me afeta" : "Também me afeta";

  return (
    <>
      {compact ? (
        <Button
          type="button"
          variant={me ? "tint" : "ghost"}
          size="small"
          aria-label={me ? `Me afeta, ${n} pessoas afetadas. Clique para sair` : `Também me afeta, ${n} pessoas afetadas`}
          aria-pressed={me}
          title={me ? "Você está entre os afetados. Clique para sair" : "Também me afeta"}
          onClick={click}
          leftIcon={me ? "fa-user-check" : "fa-user-plus"}
          iconType={me ? "solid" : "regular"}
        >
          {compactNumber(n)}
        </Button>
      ) : (
        <Button
          type="button"
          variant={me ? "default" : "tint"}
          size="medium"
          aria-pressed={me}
          title={me ? "Clique para sair dos afetados" : undefined}
          leftIcon={me ? "fa-user-check" : "fa-user-plus"}
          iconType="solid"
          onClick={click}
        >
          {label}
        </Button>
      )}
      <AffectModal s={s} role={role} show={open} onClose={() => setOpen(false)} />
    </>
  );
}

function AffectModal({ s, role, show, onClose }: { s: Sm; role: Role; show: boolean; onClose: () => void }) {
  const [text, setText] = useState("");
  const me = USERS[role];
  const close = () => {
    setText("");
    onClose();
  };

  return (
    <Modal id={`modal-afeta-${s.id}`} show={show} title="Também me afeta" variant="small" onCancel={close}>
      <div className="space-y-6">
        <div>
          <p className="text-sm font-bold text-brand-purple-dark/60">{s.id}</p>
          <p className="font-bold text-brand-purple-dark">{s.title}</p>
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
          rows={3}
          label="Como isso aparece no seu dia a dia? (opcional)"
          placeholder="Ex.: Acontece toda semana na minha unidade e remarco os atendimentos na mão."
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
        <p className="text-sm text-brand-purple-dark/60">
          <Icon name="fa-shield-halved" type="solid" /> Não inclua dados de pacientes.
        </p>
        <div className="flex justify-end gap-3 border-t border-neutral-100 pt-4">
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
      </div>
    </Modal>
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
