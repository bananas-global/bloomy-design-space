/**
 * Solicitações de melhoria — a visualização em cards da aba Solicitações (era a
 * aba Ideias). Na base, à esquerda, só informação (pessoas afetadas e
 * visualizações); à direita, as ações: Detalhes e "Também me afeta".
 *
 * O card muda conforme a relação de quem vê com a SM:
 * - Sua solicitação: borda azul e o selo; sem "Também me afeta".
 * - Te afeta: o selo, o seu relato (se houver) e o botão marcado "Me afeta".
 * - Encerrada: o desfecho (entregue com o ganho, rejeitada, cancelada) no lugar
 *   do botão, para ninguém pedir de novo o que já foi resolvido ou recusado.
 */
import { Button } from "../../components/Button.js";
import { Card } from "../../components/Card.js";
import { Icon } from "../../components/Icon.js";
import { EmptyStateCard } from "../../components/Layout.js";
import { Tag } from "../../components/Tag.js";
import { USERS, affectsMe, compact, isClosed, isMine, plural, reachOf, type Role, type Sm } from "./model.js";
import { AffectButton, AffectedCount } from "./Afetados.js";
import { PrioTag, StageTag, cx } from "./parts.js";

const short = (text: string) => (text.length > 120 ? `${text.slice(0, 118)}…` : text);

export function Cards({ sms, role, emptyText, onOpen }: { sms: Sm[]; role: Role; emptyText: string; onOpen: (s: Sm) => void }) {
  if (sms.length === 0) {
    return (
      <Card>
        <EmptyStateCard icon="fa-lightbulb" text={emptyText} />
      </Card>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
      {sms.map((s) => <SmCard key={s.id} s={s} role={role} onOpen={onOpen} />)}
    </div>
  );
}

function SmCard({ s, role, onOpen }: { s: Sm; role: Role; onOpen: (s: Sm) => void }) {
  const mine = role === "solicitante" && isMine(s, role);
  const me = affectsMe(s, role);
  const told = me ? s.affected.find((a) => a.who === USERS[role].name)?.text : "";
  const closed = isClosed(s);
  const units = reachOf(s).units.length;

  return (
    <Card className={cx("flex flex-col! border shadow-none!", mine ? "border-brand-blue/50" : "border-brand-purple-dark/10")}>
      <div className="flex flex-wrap items-center gap-2">
        <span className="tabular-nums text-sm font-bold text-brand-purple-dark/60">{s.id}</span>
        <StageTag status={s.status} />
        <PrioTag sm={s} />
        {mine && <Tag item="Sua solicitação" variant="light-blue" leftIcon="fa-user" className="ml-auto" />}
        {!mine && me && <Tag item="Te afeta" variant="dark-blue" leftIcon="fa-user-check" className="ml-auto" />}
      </div>
      <div className="flex-1 space-y-2">
        <p className="font-bold leading-snug text-brand-purple-dark">{s.title}</p>
        <p className="text-sm text-brand-purple-dark/70">{short(s.need)}</p>
        <p className="text-xs font-bold text-brand-purple-dark/60">
          {mine ? `Aberta por você em ${s.createdAt.slice(0, 10)}` : `${s.unit} · ${s.area}`} · alcança {plural(units, "unidade", "unidades")}
        </p>
        {told && <p className="rounded-lg bg-brand-blue/10 px-2.5 py-2 text-sm text-brand-purple-dark/80">Seu relato: “{told}”</p>}
      </div>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-brand-purple-dark/10 pt-3">
        <AffectedCount s={s} />
        <span title={plural(s.views, "visualização", "visualizações")} className="inline-flex items-center gap-1.5 text-sm font-bold text-brand-purple-dark/60">
          <Icon name="fa-eye" />
          {compact(s.views)}
        </span>
        <div className="ml-auto flex items-center gap-2">
          <Button type="button" variant="ghost" size="small" onClick={() => onOpen(s)}>Detalhes</Button>
          {closed ? <Outcome s={s} /> : <AffectButton s={s} role={role} size="small" />}
        </div>
      </div>
    </Card>
  );
}

/** O desfecho de uma SM encerrada, no lugar de "Também me afeta". */
export function Outcome({ s }: { s: Sm }) {
  const nowrap = "whitespace-nowrap";
  if (s.status === "concluida") return <Tag item={s.gainHours ? `Entregue · +${s.gainHours} h/mês` : "Entregue"} variant="green" leftIcon="fa-flag-checkered" className={nowrap} />;
  if (s.status === "rejeitada") return <Tag item="Rejeitada na triagem" variant="red" leftIcon="fa-ban" className={nowrap} />;
  return <Tag item={s.status === "excluida" ? "Excluída" : "Cancelada"} variant="dark-purple" leftIcon="fa-circle-xmark" className={nowrap} />;
}
