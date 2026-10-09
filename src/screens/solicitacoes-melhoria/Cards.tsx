/**
 * Solicitações de melhoria — a visualização em cards da aba Solicitações (era a
 * aba Ideias): cada SM com o resumo do pedido e, na base, como numa rede social,
 * "Também me afeta" e as visualizações.
 * Encerradas aparecem com o relato fechado, para ninguém pedir de novo o que já
 * foi resolvido ou recusado.
 */
import { Button } from "../../components/Button.js";
import { Card } from "../../components/Card.js";
import { EmptyStateCard } from "../../components/Layout.js";
import { Icon } from "../../components/Icon.js";
import { compact, plural, reachOf, type Role, type Sm } from "./model.js";
import { AffectButton } from "./Afetados.js";
import { StageTag } from "./parts.js";

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
      {sms.map((s) => (
        <Card key={s.id} className="flex flex-col! border border-brand-purple-dark/10 shadow-none!">
          <div className="flex flex-wrap items-center gap-2">
            <span className="tabular-nums text-sm font-bold text-brand-purple-dark/60">{s.id}</span>
            <StageTag status={s.status} />
          </div>
          <div className="flex-1 space-y-2">
            <p className="font-bold leading-snug text-brand-purple-dark">{s.title}</p>
            <p className="text-sm text-brand-purple-dark/70">{short(s.need)}</p>
            <p className="text-xs font-bold text-brand-purple-dark/60">{s.unit} · {s.area} · alcança {reachOf(s).units.length} {reachOf(s).units.length === 1 ? "unidade" : "unidades"}</p>
          </div>
          <div className="-mx-2 -mb-2 flex items-center gap-1 border-t border-brand-purple-dark/10 pt-3">
            <AffectButton s={s} role={role} compact />
            <span title={plural(s.views, "visualização", "visualizações")} className="inline-flex h-8 items-center gap-1.5 px-2 text-sm font-bold text-brand-purple-dark/60">
              <Icon name="fa-eye" />
              {compact(s.views)}
            </span>
            <Button type="button" variant="ghost" size="small" className="ml-auto" onClick={() => onOpen(s)}>Detalhes</Button>
          </div>
        </Card>
      ))}
    </div>
  );
}
