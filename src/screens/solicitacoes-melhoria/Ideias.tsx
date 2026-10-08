/**
 * Solicitações de melhoria — aba Ideias: as SMs em andamento, para apoiar as
 * que também afetam a rotina de quem vê. Os apoios ajudam o PMO a avaliar a
 * abrangência, mas não mudam o score.
 */
import { Button } from "../../components/Button.js";
import { Card } from "../../components/Card.js";
import { EmptyStateCard } from "../../components/Layout.js";
import { type Sm } from "./model.js";
import { StageTag } from "./parts.js";
import { sm as actions } from "./store.js";

const short = (text: string) => (text.length > 120 ? `${text.slice(0, 118)}…` : text);

export function Ideias({ sms, onOpen }: { sms: Sm[]; onOpen: (s: Sm) => void }) {
  const ideas = sms.filter((s) => !["concluida", "rejeitada", "cancelada"].includes(s.status)).sort((a, b) => b.votes - a.votes);

  return (
    <div className="space-y-6">
      <p className="max-w-2xl text-brand-purple-dark/80">
        Apoie as solicitações que também afetam a sua rotina. Os apoios ajudam o PMO a avaliar a abrangência, mas não alteram o score automaticamente.
      </p>

      {ideas.length === 0 && (
        <Card>
          <EmptyStateCard icon="fa-lightbulb" text="Nenhuma ideia em andamento" />
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
        {ideas.map((s) => (
          <Card key={s.id} className="flex">
            <Button
              type="button"
              variant={s.voted ? "default" : "tint"}
              className="h-16! w-16 flex-none flex-col items-center! gap-1"
              aria-label={s.voted ? "Retirar apoio" : "Apoiar"}
              aria-pressed={s.voted}
              onClick={() => actions.vote(s.id)}
              leftIcon="fa-thumbs-up"
              iconType="solid"
            >
              <span className="text-lg font-black leading-none">{s.votes}</span>
            </Button>
            <div className="flex min-w-0 flex-1 flex-col gap-2">
              <div className="flex flex-wrap items-center gap-2">
                <span className="tabular-nums text-sm font-bold text-brand-purple-dark/60">{s.id}</span>
                <StageTag status={s.status} />
              </div>
              <p className="font-bold leading-snug text-brand-purple-dark">{s.title}</p>
              <p className="text-sm text-brand-purple-dark/70">{short(s.need)}</p>
              <div className="mt-auto flex items-center justify-between gap-2">
                <p className="text-xs font-bold text-brand-purple-dark/60">{s.unit} · {s.area}</p>
                <Button type="button" variant="ghost" size="small" onClick={() => onOpen(s)}>Detalhes</Button>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
