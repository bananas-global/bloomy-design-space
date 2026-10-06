/**
 * CRM de Leads — o funil: um quadro por etapa, com arrastar e soltar.
 * Novo — não existe no Phoenix (lá a lista de Leads é só a tabela).
 *
 * Soltar numa coluna move o lead e registra no histórico; soltar em Efetivado
 * abre o drawer de Efetivar Paciente.
 */
import { useState } from "react";
import { Icon } from "../../components/Icon.js";
import { Tag } from "../../components/Tag.js";
import {
  COLUMNS, authInfo, authShown, daysInStage, followText, followTone, guardianOf, hoursOf, operatorName,
  type ColumnId, type Lead,
} from "./model.js";
import { Initials, STAGE_BG, STAGE_DOT, cx } from "./parts.js";

const FOLLOW_CLASS = {
  late: "text-red",
  today: "text-orange-dark",
  ok: "text-brand-blue-dark",
  none: "text-brand-purple-dark/40",
};

const AUTH_DOT = {
  autorizado: "bg-green",
  negado: "bg-red",
  solicitado: "bg-brand-orange",
  pendente: "bg-brand-purple-dark/30",
};

export function Board({
  leads, canCreate, onOpen, onDrop, onNew,
}: {
  leads: Lead[];
  canCreate: boolean;
  onOpen: (l: Lead) => void;
  onDrop: (l: Lead, to: ColumnId) => void;
  onNew: () => void;
}) {
  const [drag, setDrag] = useState<string | null>(null);
  const [over, setOver] = useState<ColumnId | null>(null);

  function drop(col: ColumnId) {
    setOver(null);
    const l = leads.find((x) => x.id === drag);
    setDrag(null);
    if (!l || l.status === col) return;
    onDrop(l, col);
  }

  return (
    <div className="-mx-6 mt-6 flex items-start gap-3.5 overflow-x-auto px-6 pb-2.5 thin-scrollbar">
      {COLUMNS.map((col) => {
        const items = leads.filter((l) => l.status === col.id);
        const hours = items.reduce((s, l) => s + hoursOf(l), 0);
        return (
          <section
            key={col.id}
            aria-label={col.label}
            data-column={col.id}
            onDragOver={(e) => { e.preventDefault(); setOver(col.id); }}
            onDragLeave={() => setOver((o) => (o === col.id ? null : o))}
            onDrop={() => drop(col.id)}
            className={cx(
              "flex min-h-44 w-66 flex-none flex-col gap-2.5 rounded-2xl border p-3 transition-colors duration-200",
              STAGE_BG[col.id],
              over === col.id ? "border-brand-blue bg-brand-blue/10" : "border-transparent",
            )}
          >
            <header className="flex items-center gap-2 px-1">
              <span className={cx("h-2 w-2 flex-none rounded-full", STAGE_DOT[col.id])} />
              <h3 className="flex-1 truncate text-sm font-extrabold text-brand-purple-dark">{col.label}</h3>
              {col.id !== "efetivado" && (
                <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-white px-1.5 text-xs font-extrabold text-brand-purple-dark/70">{items.length}</span>
              )}
            </header>

            {col.id === "efetivado" ? (
              <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-green/40 px-4 py-8 text-center text-sm text-brand-green-dark">
                <Icon name="fa-user-check" type="solid" className="text-xl" />
                <p>Arraste um lead até aqui para efetivar como paciente.</p>
              </div>
            ) : (
              <>
                <p className="px-1 text-xs font-semibold text-brand-purple-dark/50">{hours > 0 ? `${hours}h/sem de carga prevista` : "—"}</p>
                <div className="flex flex-col gap-2.5">
                  {items.map((l) => (
                    <LeadCard key={l.id} lead={l} dragging={drag === l.id} onDragStart={() => setDrag(l.id)} onDragEnd={() => { setDrag(null); setOver(null); }} onClick={() => onOpen(l)} />
                  ))}
                  {items.length === 0 && <p className="py-4 text-center text-sm text-brand-purple-dark/40">Nenhum lead</p>}
                </div>
                {canCreate && col.id === "novo" && (
                  <button
                    type="button"
                    onClick={onNew}
                    className="flex items-center justify-center gap-2 rounded-xl border border-dashed border-brand-purple-dark/20 py-2.5 text-sm font-bold text-brand-blue-dark transition-colors hover:bg-white"
                  >
                    <Icon name="fa-plus" /> Novo lead
                  </button>
                )}
              </>
            )}
          </section>
        );
      })}
    </div>
  );
}

function LeadCard({ lead: l, dragging, onDragStart, onDragEnd, onClick }: { lead: Lead; dragging: boolean; onDragStart: () => void; onDragEnd: () => void; onClick: () => void }) {
  const tone = followTone(l.nextFollowUp);
  const g = guardianOf(l);
  const auth = authInfo(l);
  return (
    <article
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onClick={onClick}
      className={cx(
        "cursor-pointer space-y-2.5 rounded-xl bg-white p-3 shadow-main transition-all hover:-translate-y-0.5",
        dragging && "rotate-1 opacity-50",
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate font-bold text-brand-purple-dark">{g.name || "Sem responsável"}</p>
          <p className="truncate text-sm text-brand-purple-dark/60">{l.child}{l.age ? `, ${l.age} anos` : ""}</p>
        </div>
        <Initials name={l.owner || "?"} size="medium" title={`Responsável: ${l.owner || "—"}`} />
      </div>
      <div className="flex flex-wrap gap-1">
        <Tag item={operatorName(l, "Convênio não informado")} variant="dark-purple" leftIcon="fa-building" className="text-xs" />
      </div>
      {authShown(l) && (
        <p className="flex items-center gap-2 text-xs font-bold text-brand-purple-dark/70" title={auth.title}>
          <span className={cx("h-1.5 w-1.5 rounded-full", AUTH_DOT[auth.id])} />
          {auth.label}
        </p>
      )}
      <div className="flex items-center justify-between border-t border-brand-purple-dark/10 pt-2 text-xs font-bold">
        <span className={cx("flex items-center gap-1.5", FOLLOW_CLASS[tone])}>
          <Icon name="fa-flag" type="solid" />
          {followText(l.nextFollowUp)}
        </span>
        <span className="text-brand-purple-dark/50" title="Dias nesta etapa">{daysInStage(l)}d</span>
      </div>
    </article>
  );
}
